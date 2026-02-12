export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  // TEMP: replace with real wallet accountId next
  const claimant = "wallet-user";

  try {
    const result = await prisma.task.updateMany({
      where: {
        id,
        funded: true,
        status: "Open",
        claimant: null,
      },
      data: {
        status: "Claimed",
        claimant,
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
