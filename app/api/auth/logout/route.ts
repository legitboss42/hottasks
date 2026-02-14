export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { AUTH_CHALLENGE_COOKIE, AUTH_SESSION_COOKIE, authCookieOptions } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_SESSION_COOKIE, "", {
    ...authCookieOptions,
    maxAge: 0,
  });
  response.cookies.set(AUTH_CHALLENGE_COOKIE, "", {
    ...authCookieOptions,
    maxAge: 0,
  });
  return response;
}
