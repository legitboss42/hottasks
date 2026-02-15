import TaskApp from "@/components/TaskApp";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import type { Task as DbTask } from "@prisma/client";
import { readWalletAddressFromCookieStore } from "@/lib/auth";

export const dynamic = "force-dynamic";

const validStatuses = ["OPEN", "CLAIMED", "SUBMITTED", "RELEASED"] as const;
type TaskStatus = (typeof validStatuses)[number];

function normalizeStatus(status: unknown): TaskStatus {
  const upper = String(status ?? "").toUpperCase();
  return (validStatuses as readonly string[]).includes(upper) ? (upper as TaskStatus) : "OPEN";
}

type Task = {
  id: string;
  title: string;
  description: string;
  reward: number;
  status: TaskStatus;
  funded: boolean;
  creator: string;
  claimant: string | null;
  payoutItemId: string | null;
  createdAt: number;
};

export default async function Home() {
  const cookieStore = await cookies();
  const wallet = readWalletAddressFromCookieStore(cookieStore) ?? "";

  const tasks = await prisma.task.findMany({
    where: {
      OR: wallet ? [{ funded: true }, { creator: wallet }] : [{ funded: true }],
    },
    orderBy: { createdAt: "desc" },
  });

  const initialTasks: Task[] = tasks.map((t: DbTask) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    reward: t.reward,
    status: normalizeStatus(t.status),
    funded: t.funded,
    creator: t.creator,
    claimant: t.claimant,
    payoutItemId: t.payoutItemId,
    createdAt: t.createdAt.getTime(),
  }));

  return <TaskApp initialTasks={initialTasks} />;
}
