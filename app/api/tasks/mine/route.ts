export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import type { Task } from "@prisma/client";

const validStatuses = new Set(["OPEN", "CLAIMED", "SUBMITTED", "RELEASED"]);

function normalizeStatus(status: unknown) {
  const upper = String(status ?? "").toUpperCase();
  return validStatuses.has(upper) ? upper : "OPEN";
}

function serialize(task: Task) {
  return {
    ...task,
    status: normalizeStatus(task.status),
    createdAt: task.createdAt instanceof Date ? task.createdAt.getTime() : task.createdAt,
  };
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const walletAddress =
    typeof body?.walletAddress === "string" ? body.walletAddress.trim() : "";

  if (!walletAddress) {
    return NextResponse.json({ error: "Wallet required" }, { status: 401 });
  }

  const tasks = await prisma.task.findMany({
    where: { creator: walletAddress },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tasks.map(serialize));
}
