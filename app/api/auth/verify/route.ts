export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { isAddress, verifyMessage } from "viem";
import {
  AUTH_CHALLENGE_COOKIE,
  AUTH_SESSION_COOKIE,
  AUTH_SESSION_MAX_AGE_SECONDS,
  authCookieOptions,
  buildAuthMessage,
  createSession,
  verifyChallengeFromRequest,
} from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const address = typeof body?.address === "string" ? body.address.trim().toLowerCase() : "";
  const signature = typeof body?.signature === "string" ? body.signature.trim() : "";

  if (!address || !signature || !isAddress(address)) {
    return NextResponse.json({ error: "Invalid authentication payload." }, { status: 400 });
  }

  const challenge = verifyChallengeFromRequest(request);
  if (!challenge) {
    return NextResponse.json({ error: "Challenge missing or expired." }, { status: 401 });
  }

  if (challenge.address !== address) {
    return NextResponse.json({ error: "Challenge address mismatch." }, { status: 401 });
  }

  const message = buildAuthMessage(challenge);
  const verified = await verifyMessage({
    address,
    message,
    signature: signature as `0x${string}`,
  });

  if (!verified) {
    return NextResponse.json({ error: "Signature verification failed." }, { status: 401 });
  }

  const sessionToken = createSession(address);
  const response = NextResponse.json({ authenticated: true, address });
  response.cookies.set(AUTH_SESSION_COOKIE, sessionToken, {
    ...authCookieOptions,
    maxAge: AUTH_SESSION_MAX_AGE_SECONDS,
  });
  response.cookies.set(AUTH_CHALLENGE_COOKIE, "", {
    ...authCookieOptions,
    maxAge: 0,
  });
  return response;
}
