import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { readWalletAddressFromCookieStore } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ task_id?: string; payment_id?: string }>;
}) {
  const resolved = await searchParams;

  const taskId = typeof resolved.task_id === "string" ? resolved.task_id.trim() : "";
  const paymentId = typeof resolved.payment_id === "string" ? resolved.payment_id.trim() : "";

  if (!taskId) {
    redirect("/");
  }

  const cookieStore = await cookies();
  const wallet = readWalletAddressFromCookieStore(cookieStore);

  if (wallet) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, creator: true, funded: true },
    });

    if (task && !task.funded && task.creator.toLowerCase() === wallet.toLowerCase()) {
      await prisma.task.update({
        where: { id: taskId },
        data: {
          funded: true,
          status: "OPEN",
          txHash: paymentId || null,
        },
      });
    }
  }

  redirect(`/tasks/${taskId}`);
}
