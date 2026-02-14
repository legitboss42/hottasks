import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export const AUTH_SESSION_COOKIE = "hot_auth_session";
export const AUTH_CHALLENGE_COOKIE = "hot_auth_challenge";
export const WALLET_COOKIE = "hot_wallet";
export const AUTH_CHAIN_ID = 11155111;
export const AUTH_CHALLENGE_MAX_AGE_SECONDS = 60 * 10;
export const AUTH_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

type CookieStoreLike = {
  get: (name: string) => { value: string } | undefined;
};

type ChallengePayload = {
  kind: "challenge";
  address: string;
  nonce: string;
  domain: string;
  uri: string;
  chainId: number;
  issuedAt: string;
  exp: number;
};

type SessionPayload = {
  kind: "session";
  address: string;
  exp: number;
};

type AnyPayload = ChallengePayload | SessionPayload;

export const authCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export function normalizeWalletAddress(address: string) {
  return address.trim().toLowerCase();
}

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("Missing AUTH_SECRET (or NEXTAUTH_SECRET) for wallet authentication.");
  }
  return secret;
}

function signValue(value: string) {
  return createHmac("sha256", getAuthSecret()).update(value).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

function encodePayload(payload: AnyPayload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodePayload<T>(encoded: string) {
  try {
    return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

function createSignedToken(payload: AnyPayload) {
  const encoded = encodePayload(payload);
  const signature = signValue(encoded);
  return `${encoded}.${signature}`;
}

function verifySignedToken<T extends AnyPayload>(token: string | null | undefined, kind: T["kind"]) {
  if (!token) return null;

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expectedSignature = signValue(encoded);
  if (!safeEqual(signature, expectedSignature)) return null;

  const payload = decodePayload<T>(encoded);
  if (!payload) return null;
  if (payload.kind !== kind) return null;
  if (payload.exp <= Math.floor(Date.now() / 1000)) return null;

  return payload;
}

function parseCookieHeader(cookieHeader: string) {
  const result = new Map<string, string>();
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [rawName, ...rawValueParts] = part.split("=");
    const name = rawName?.trim();
    if (!name) continue;
    const value = rawValueParts.join("=").trim();
    if (!value) continue;
    result.set(name, decodeURIComponent(value));
  }
  return result;
}

function readCookieFromRequest(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const parsed = parseCookieHeader(cookieHeader);
  return parsed.get(name) ?? null;
}

function requestOrigin(request: Request) {
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "localhost:3000";
  const proto =
    request.headers.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}

export function buildAuthMessage(payload: ChallengePayload) {
  return [
    `${payload.domain} wants you to sign in to HOTTasks.`,
    "",
    "Sign this message to authenticate your wallet session.",
    "",
    `URI: ${payload.uri}`,
    "Version: 1",
    `Chain ID: ${payload.chainId}`,
    `Nonce: ${payload.nonce}`,
    `Issued At: ${payload.issuedAt}`,
  ].join("\n");
}

export function createChallenge(address: string, request: Request) {
  const normalizedAddress = normalizeWalletAddress(address);
  const origin = requestOrigin(request);
  const now = Math.floor(Date.now() / 1000);
  const issuedAt = new Date().toISOString();
  const nonce = randomBytes(16).toString("hex");

  const payload: ChallengePayload = {
    kind: "challenge",
    address: normalizedAddress,
    nonce,
    domain: new URL(origin).host,
    uri: origin,
    chainId: AUTH_CHAIN_ID,
    issuedAt,
    exp: now + AUTH_CHALLENGE_MAX_AGE_SECONDS,
  };

  return {
    token: createSignedToken(payload),
    message: buildAuthMessage(payload),
  };
}

export function verifyChallengeFromRequest(request: Request) {
  const token = readCookieFromRequest(request, AUTH_CHALLENGE_COOKIE);
  return verifySignedToken<ChallengePayload>(token, "challenge");
}

export function createSession(address: string) {
  const payload: SessionPayload = {
    kind: "session",
    address: normalizeWalletAddress(address),
    exp: Math.floor(Date.now() / 1000) + AUTH_SESSION_MAX_AGE_SECONDS,
  };
  return createSignedToken(payload);
}

export function readWalletHeaderFromRequest(request: Request) {
  const rawWallet = request.headers.get("x-wallet");
  if (!rawWallet) return null;

  const wallet = normalizeWalletAddress(rawWallet);
  return wallet || null;
}

export function readSessionAddressFromRequest(request: Request) {
  const token = readCookieFromRequest(request, AUTH_SESSION_COOKIE);
  const payload = verifySignedToken<SessionPayload>(token, "session");
  return payload?.address ?? null;
}

export function readSessionAddressFromCookieStore(cookieStore: CookieStoreLike) {
  const token = cookieStore.get(AUTH_SESSION_COOKIE)?.value ?? null;
  const payload = verifySignedToken<SessionPayload>(token, "session");
  return payload?.address ?? null;
}

export function readWalletAddressFromCookieStore(cookieStore: CookieStoreLike) {
  const sessionWallet = readSessionAddressFromCookieStore(cookieStore);
  if (sessionWallet) return sessionWallet;

  const rawWallet = cookieStore.get(WALLET_COOKIE)?.value ?? "";
  if (!rawWallet) return null;

  const wallet = normalizeWalletAddress(rawWallet);
  return wallet || null;
}
