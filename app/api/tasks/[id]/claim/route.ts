import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const result = await prisma.task.updateMany({
      where: {
        id: params.id,
        funded: true,
        status: "Open",
        claimant: null,
      },
      data: {
        status: "Claimed",
        claimant: "wallet-user", // we’ll replace with real wallet next
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Already claimed or not funded" },
        { status: 409 }
      );
    }

    const updated = await prisma.task.findUnique({ where: { id: params.id } });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Already claimed or not funded" },
      { status: 409 }
    );
  }
}
