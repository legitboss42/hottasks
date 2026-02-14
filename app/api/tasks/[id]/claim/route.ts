export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { readWalletHeaderFromRequest } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const walletAddress = readWalletHeaderFromRequest(req);

  if (!walletAddress) {
    return NextResponse.json({ error: "Wallet required" }, { status: 401 });
  }

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  if (task.creator.toLowerCase() === walletAddress.toLowerCase()) {
    return NextResponse.json({ error: "Creator cannot claim this task." }, { status: 403 });
  }

  if (!task.funded || task.status !== "OPEN" || task.claimant) {
    return NextResponse.json(
      { error: "Task cannot be claimed (already claimed or not funded)." },
      { status: 409 }
    );
  }

  try {
    const result = await prisma.task.updateMany({
      where: {
        id,
        funded: true,
        status: "OPEN",
        claimant: null,
      },
      data: {
        status: "CLAIMED",
        claimant: walletAddress,
        claimedAt: new Date(),
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Task cannot be claimed (already claimed or not funded)." },
        { status: 409 }
      );
    }

    const updated = await prisma.task.findUnique({ where: { id } });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Task cannot be claimed (already claimed or not funded)." },
      { status: 409 }
    );
  }
}
