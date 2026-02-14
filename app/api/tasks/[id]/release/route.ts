export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { readWalletHeaderFromRequest } from "@/lib/auth";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const wallet = readWalletHeaderFromRequest(req);

  if (!wallet) {
    return NextResponse.json({ error: "Wallet required" }, { status: 401 });
  }

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  if (task.creator.toLowerCase() !== wallet.toLowerCase()) {
    return NextResponse.json({ error: "Only the creator can release payout." }, { status: 403 });
  }

  // TODO: replace with real HOT Pay payout call
  // For now we simulate success
  const result = await prisma.task.updateMany({
    where: {
      id,
      status: "SUBMITTED",
    },
    data: {
      status: "RELEASED",
      releasedAt: new Date(),
    },
  });

  if (result.count === 0) {
    return NextResponse.json(
      { error: "Task must be Submitted before release." },
      { status: 409 }
    );
  }

  const updated = await prisma.task.findUnique({ where: { id } });
  return NextResponse.json(updated);
}
