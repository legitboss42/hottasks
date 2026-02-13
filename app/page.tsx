import TaskApp from "@/components/TaskApp";
import { prisma } from "@/lib/prisma";
import type { Task as DbTask } from "@prisma/client";

export const dynamic = "force-dynamic";

const validStatuses = ["OPEN", "CLAIMED", "SUBMITTED", "RELEASED"] as const;
type TaskStatus = (typeof validStatuses)[number];

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
  const tasks = await prisma.task.findMany({
    where: { funded: true },
    orderBy: { createdAt: "desc" },
  });

  const initialTasks: Task[] = tasks.map((t: DbTask) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    reward: t.reward,
    status: (validStatuses as readonly string[]).includes(t.status)
      ? (t.status as TaskStatus)
      : "OPEN",
    funded: t.funded,
    creator: t.creator,
    claimant: t.claimant,
    payoutItemId: t.payoutItemId,
    createdAt: t.createdAt.getTime(),
  }));

  return <TaskApp initialTasks={initialTasks} />;
}
