import PayoutSuccessClient from "@/components/PayoutSuccessClient";

export const dynamic = "force-dynamic";

export default function PayoutSuccessPage({
  searchParams,
}: {
  searchParams?: { task_id?: string };
}) {
  const taskId = typeof searchParams?.task_id === "string" ? searchParams.task_id : null;
  return <PayoutSuccessClient taskId={taskId} />;
}
