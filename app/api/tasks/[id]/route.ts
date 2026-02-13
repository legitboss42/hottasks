import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Task } from "@prisma/client";

const validStatuses = ["OPEN", "CLAIMED", "SUBMITTED", "RELEASED"] as const;

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
    const { id } = await params;
    const body = await request.json();
    const data: {
      funded?: boolean;
      status?: (typeof validStatuses)[number];
      claimant?: string | null;
      payoutItemId?: string | null;
    } = {};

    if (typeof body.funded === "boolean") data.funded = body.funded;
    if (typeof body.status === "string" && validStatuses.includes(body.status)) {
      data.status = body.status;
    }
    if (typeof body.claimant === "string") data.claimant = body.claimant;
    if (body.claimant === null) data.claimant = null;
    if (typeof body.payoutItemId === "string") data.payoutItemId = body.payoutItemId;
    if (body.payoutItemId === null) data.payoutItemId = null;

    const task = await prisma.task.update({
      where: { id },
      data,
    });

    return NextResponse.json(serialize(task));
  } catch {
    return NextResponse.json({ error: "Update failed." }, { status: 400 });
  }
}
