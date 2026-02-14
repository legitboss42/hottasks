export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { readWalletHeaderFromRequest } from "@/lib/auth";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const walletAddress = readWalletHeaderFromRequest(req);

  if (!walletAddress) {
    return NextResponse.json({ error: "Wallet required" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const refundTxHash = typeof body?.refundTxHash === "string" ? body.refundTxHash.trim() : "";

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  if (task.creator.toLowerCase() !== walletAddress.toLowerCase()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (task.status !== "OPEN" || task.claimant) {
    return NextResponse.json(
      { error: "Only unclaimed OPEN tasks can be canceled." },
      { status: 409 }
    );
  }

  if (task.funded && !refundTxHash) {
    return NextResponse.json(
      { error: "Refund transaction hash required for funded task cancellation." },
      { status: 400 }
    );
  }

  const deleted = await prisma.task.deleteMany({
    where: {
      id,
      creator: walletAddress,
      funded: task.funded,
      status: "OPEN",
      claimant: null,
    },
  });

  if (deleted.count === 0) {
    return NextResponse.json(
      { error: "Task cancellation failed. Task may have been claimed already." },
      { status: 409 }
    );
  }

  return NextResponse.json({
    success: true,
    refunded: task.funded,
    refundTxHash: refundTxHash || null,
  });
}

