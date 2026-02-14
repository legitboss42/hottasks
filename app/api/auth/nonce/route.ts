export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { isAddress } from "viem";
import {
  AUTH_CHALLENGE_COOKIE,
  AUTH_CHALLENGE_MAX_AGE_SECONDS,
  authCookieOptions,
  createChallenge,
} from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const address = typeof body?.address === "string" ? body.address.trim() : "";

  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: "Valid wallet address required." }, { status: 400 });
  }

  const { token, message } = createChallenge(address, request);

  const response = NextResponse.json({ message });
  response.cookies.set(AUTH_CHALLENGE_COOKIE, token, {
    ...authCookieOptions,
    maxAge: AUTH_CHALLENGE_MAX_AGE_SECONDS,
  });
  return response;
}
