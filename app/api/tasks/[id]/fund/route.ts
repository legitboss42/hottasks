export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { readWalletHeaderFromRequest } from "@/lib/auth";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const wallet = readWalletHeaderFromRequest(req);
    if (!wallet) {
      return NextResponse.json({ error: "Wallet required" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const paymentRef = typeof body?.paymentId === "string" ? body.paymentId.trim() : "";
    const txHash = typeof body?.txHash === "string" ? body.txHash.trim() : "";
    const storedReference = paymentRef || txHash || null;

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    if (task.creator.toLowerCase() !== wallet.toLowerCase()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (task.funded) {
      return NextResponse.json({ success: true, alreadyFunded: true });
    }

    await prisma.task.update({
      where: { id },
      data: {
        funded: true,
        status: "OPEN",
        txHash: storedReference,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Funding update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
