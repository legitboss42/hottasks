export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { readSessionAddressFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  const address = readSessionAddressFromRequest(request);
  return NextResponse.json({
    authenticated: Boolean(address),
    address,
  });
}
