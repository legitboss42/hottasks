export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import type { Task } from "@prisma/client";

function serialize(task: Task) {
  return {
    ...task,
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
