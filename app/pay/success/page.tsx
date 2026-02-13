import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type SearchParams = {
  taskId?: string;
  payoutItemId?: string;
};

export default async function Success({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const taskId = typeof searchParams?.taskId === "string" ? searchParams.taskId : "";
  const payoutItemId =
    typeof searchParams?.payoutItemId === "string" ? searchParams.payoutItemId : "";

  if (taskId && payoutItemId) {
    await prisma.task.updateMany({
      where: { id: taskId },
      data: {
        funded: true,
        payoutItemId,
        status: "OPEN",
      },
    });
  }

  redirect("/");
}
