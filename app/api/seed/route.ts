export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
  const count = await prisma.task.count();

  if (count > 0) {
    return NextResponse.json({ ok: true, seeded: false });
  }

  await prisma.task.createMany({
    data: [
      {
        title: "Fix homepage typo",
        description: "Change hero headline text",
        reward: 5,
        funded: true,
        status: "OPEN",
        creator: "demo.near",
      },
      {
        title: "Add dark mode toggle",
        description: "Simple Tailwind class switch",
        reward: 15,
        funded: true,
        status: "OPEN",
        creator: "demo.near",
      },
      {
        title: "Deploy Next.js app",
        description: "Setup Vercel + env vars",
        reward: 10,
        funded: true,
        status: "OPEN",
        creator: "demo.near",
      },
    ],
  });

  return NextResponse.json({ ok: true, seeded: true });
}
