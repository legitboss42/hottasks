import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params; // ✅ THIS is the fix

  try {
    const updated = await prisma.task.update({
      where: {
        id,
        funded: true,
        status: "Open",
        claimant: null,
      },
      data: {
        status: "Claimed",
        claimant: "wallet-user",
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Already claimed or not funded" },
      { status: 409 }
    );
  }
}
