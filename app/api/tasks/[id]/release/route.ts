export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  // TODO: replace with real HOT Pay payout call
  // For now we simulate success
  const result = await prisma.task.updateMany({
    where: {
      id,
      status: "Submitted",
    },
    data: {
      status: "Released",
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
