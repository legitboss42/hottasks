"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAccount } from "wagmi";
import ConnectWallet from "@/components/ConnectWallet";
import { buildHotPayPaymentUrl } from "@/lib/hotpay";

type TaskStatus = "OPEN" | "CLAIMED" | "SUBMITTED" | "RELEASED";

type TaskDetailActionsProps = {
  id: string;
  funded: boolean;
  status: TaskStatus;
  claimant: string | null;
  creator: string;
  reward: number;
};

export default function TaskDetailActions({
  id,
  funded,
  status,
  claimant,
  creator,
  reward,
}: TaskDetailActionsProps) {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState<"fund" | "claim" | "cancel" | null>(null);

  const isCreator = !!address && address.toLowerCase() === creator.toLowerCase();
  const isOpenUnclaimed = status === "OPEN" && !claimant;
  const isClaimable = funded && status === "OPEN" && !claimant;

  async function fundTask(taskId: string, amount: number) {
    if (!isConnected || !address || !isCreator) return;

    const itemId = process.env.NEXT_PUBLIC_HOTPAY_ITEM_ID?.trim() ?? "";
    if (!itemId) {
      alert("Missing NEXT_PUBLIC_HOTPAY_ITEM_ID in .env.local");
      return;
    }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "";
    if (!appUrl) {
      alert("Missing NEXT_PUBLIC_APP_URL in .env.local");
      return;
    }
    const normalizedAppUrl = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(appUrl)
      ? appUrl
      : `https://${appUrl}`;

    setLoading("fund");
    try {
      const baseUrl = new URL(normalizedAppUrl);
      const host = baseUrl.hostname.toLowerCase();
      if (host === "localhost" || host === "127.0.0.1") {
        alert("NEXT_PUBLIC_APP_URL must be a public domain whitelisted in HotPay item settings.");
        return;
      }
      const redirectUrl = new URL(
        `/pay/success?task_id=${encodeURIComponent(taskId)}`,
        baseUrl
      ).toString();
      const hotPayUrl = buildHotPayPaymentUrl({
        itemId,
        amount,
        redirectUrl,
      });
      window.location.href = hotPayUrl;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to open HOT Pay. Check NEXT_PUBLIC_APP_URL format.";
      alert(message);
    } finally {
      setLoading(null);
    }
  }

  async function claimTask() {
    if (!isConnected || !address) return;

    setLoading("claim");
    try {
      const res = await fetch(`/api/tasks/${id}/claim`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet": address,
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Claim failed.");
        return;
      }

      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function cancelTask() {
    if (!isConnected || !address || !isCreator || !isOpenUnclaimed) return;

    const confirmCopy = funded
      ? "Cancel this funded task and process refund? This removes the task."
      : "Cancel this task? This removes the task.";

    const confirmed = window.confirm(confirmCopy);
    if (!confirmed) return;

    let refundTxHash = "";
    if (funded) {
      const value = prompt("Paste refund transaction hash:");
      if (!value) return;
      refundTxHash = value.trim();
      if (!refundTxHash) return;
    }

    setLoading("cancel");
    try {
      const res = await fetch(`/api/tasks/${id}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet": address,
        },
        body: JSON.stringify({
          refundTxHash: funded ? refundTxHash : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Cancel failed.");
        return;
      }

      router.push("/");
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  if (!funded) {
    if (!isConnected || !address) {
      return <ConnectWallet />;
    }

    if (isConnected && isCreator) {
      return (
        <div className="actions-row">
          <button
            className="btn primary"
            onClick={() => fundTask(id, reward)}
            disabled={loading === "fund" || loading === "cancel"}
          >
            {loading === "fund" ? "Funding..." : "Fund"}
          </button>
          <button className="btn danger" onClick={cancelTask} disabled={loading === "fund" || loading === "cancel"}>
            {loading === "cancel" ? "Canceling..." : "Cancel task"}
          </button>
        </div>
      );
    }

    return (
      <button className="btn" disabled>
        {isConnected ? "Waiting for creator funding" : "Connect creator wallet to fund"}
      </button>
    );
  }

  if (!isClaimable) {
    return (
      <button className="btn" disabled>
        {claimant ? "Already claimed" : `${status.charAt(0)}${status.slice(1).toLowerCase()}`}
      </button>
    );
  }

  if (!isConnected || !address) {
    return <ConnectWallet />;
  }

  if (isCreator) {
    return (
      <button className="btn danger" onClick={cancelTask} disabled={loading === "cancel"}>
        {loading === "cancel" ? "Refunding..." : "Cancel + refund"}
      </button>
    );
  }

  return (
    <button className="btn primary" onClick={claimTask} disabled={loading === "claim"}>
      {loading === "claim" ? "Claiming..." : "Claim task"}
    </button>
  );
}
