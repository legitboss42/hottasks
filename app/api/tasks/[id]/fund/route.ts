export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const txHash = typeof body?.txHash === "string" ? body.txHash.trim() : "";
  const walletAddress =
    typeof body?.walletAddress === "string" ? body.walletAddress.trim() : "";

  if (!txHash || !walletAddress) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  const task = await prisma.task.findUnique({ where: { id } });

  if (!task || task.creator !== walletAddress) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (task.funded) {
    return NextResponse.json({ error: "Task already funded" }, { status: 409 });
  }

  await prisma.task.update({
    where: { id },
    data: {
      funded: true,
      txHash,
      status: "OPEN",
    },
  });

  return NextResponse.json({ success: true });
}
