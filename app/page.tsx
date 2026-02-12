import TaskApp from "@/components/TaskApp";
import { prisma } from "@/lib/prisma";
import type { Task as DbTask } from "@prisma/client";

export const dynamic = "force-dynamic";

const validStatuses = ["Open", "Claimed", "Submitted", "Released"] as const;
type TaskStatus = (typeof validStatuses)[number];

type Task = {
  id: string;
  title: string;
  description: string;
  reward: number;
  status: TaskStatus;
  funded: boolean;
  claimant: string | null;
  payoutItemId: string | null;
  createdAt: number;
};

export default async function Home() {
  const tasks = await prisma.task.findMany({
    orderBy: { createdAt: "desc" },
  });

  const initialTasks: Task[] = tasks.map((t: DbTask) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    reward: t.reward,
    status: (validStatuses as readonly string[]).includes(t.status)
      ? (t.status as TaskStatus)
      : "Open",
    funded: t.funded,
    claimant: t.claimant,
    payoutItemId: t.payoutItemId,
    createdAt: t.createdAt.getTime(),
  }));

  return <TaskApp initialTasks={initialTasks} />;
}
