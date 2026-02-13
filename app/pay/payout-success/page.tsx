import PayoutSuccessClient from "@/components/PayoutSuccessClient";

export const dynamic = "force-dynamic";

export default function PayoutSuccessPage({
  searchParams: _searchParams,
}: {
  searchParams?: { task_id?: string };
}) {
  return <PayoutSuccessClient />;
}
