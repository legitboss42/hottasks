import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Task } from "@prisma/client";
import { readWalletHeaderFromRequest } from "@/lib/auth";

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

export async function GET(request: Request) {
  const wallet = readWalletHeaderFromRequest(request);

  const tasks = await prisma.task.findMany({
    where: {
      OR: wallet ? [{ funded: true }, { creator: wallet }] : [{ funded: true }],
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tasks.map(serialize));
}

export async function POST(request: Request) {
  try {
    const wallet = readWalletHeaderFromRequest(request);

    if (!wallet) {
      return NextResponse.json({ error: "Wallet required" }, { status: 401 });
    }

    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const rewardRaw = Number(body.reward);

    if (!title) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }

    if (!description) {
      return NextResponse.json({ error: "Description is required." }, { status: 400 });
    }

    if (!Number.isFinite(rewardRaw) || rewardRaw <= 0) {
      return NextResponse.json({ error: "Reward must be a number > 0." }, { status: 400 });
    }

    const reward = Math.round(rewardRaw);

    const task = await prisma.task.create({
      data: {
        title,
        description,
        reward,
        status: "OPEN",
        creator: wallet,
        funded: false,
      },
    });

    return NextResponse.json(serialize(task), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
