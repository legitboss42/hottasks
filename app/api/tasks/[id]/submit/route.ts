export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const proofUrl = typeof body?.proofUrl === "string" ? body.proofUrl.trim() : "";

  if (!proofUrl) {
    return NextResponse.json({ error: "Proof is required." }, { status: 400 });
  }

  const result = await prisma.task.updateMany({
    where: {
      id,
      status: "CLAIMED",
    },
    data: {
      status: "SUBMITTED",
      proofUrl,
      submittedAt: new Date(),
    },
  });

  if (result.count === 0) {
    return NextResponse.json(
      { error: "Task must be Claimed before submitting proof." },
      { status: 409 }
    );
  }

  const updated = await prisma.task.findUnique({ where: { id } });
  return NextResponse.json(updated);
}
