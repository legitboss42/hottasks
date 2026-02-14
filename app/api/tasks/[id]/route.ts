import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Task } from "@prisma/client";
import { readWalletHeaderFromRequest } from "@/lib/auth";

function serialize(task: Task) {
  return {
    ...task,
    createdAt: task.createdAt instanceof Date ? task.createdAt.getTime() : task.createdAt,
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const wallet = readWalletHeaderFromRequest(request);
    if (!wallet) {
      return NextResponse.json({ error: "Wallet required" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }

    if (existing.creator.toLowerCase() !== wallet.toLowerCase()) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const body = await request.json();
    if (typeof body.funded === "boolean") {
      return NextResponse.json(
        { error: "Use /api/tasks/[id]/fund for funding updates." },
        { status: 400 }
      );
    }

    if (typeof body.status !== "undefined" || typeof body.claimant !== "undefined") {
      return NextResponse.json(
        { error: "Use dedicated submit, claim, and release routes for status updates." },
        { status: 400 }
      );
    }

    const data: {
      payoutItemId?: string | null;
    } = {};

    if (typeof body.payoutItemId === "string") data.payoutItemId = body.payoutItemId;
    if (body.payoutItemId === null) data.payoutItemId = null;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No supported updates." }, { status: 400 });
    }

    const task = await prisma.task.update({
      where: { id },
      data,
    });

    return NextResponse.json(serialize(task));
  } catch {
    return NextResponse.json({ error: "Update failed." }, { status: 400 });
  }
}
