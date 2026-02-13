export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const updated = await prisma.task.update({
    where: { id },
    data: { funded: true, status: "OPEN" },
  });

  return NextResponse.json(updated);
}
