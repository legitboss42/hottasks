import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function Success() {
  // Funding is not marked here. The dedicated /fund API enforces creator + txHash checks.
  redirect("/");
}
