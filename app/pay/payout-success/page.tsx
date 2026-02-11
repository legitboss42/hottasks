"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type TaskStatus = "Open" | "Claimed" | "Submitted" | "Released";

type Task = {
  id: string;
  title: string;
  description: string;
  rewardHot: number;
  status: TaskStatus;
  funded?: boolean;
  claimant?: string;
  payoutItemId?: string;
  createdAt: number;
};

export default function PayoutSuccessPage() {
  const [done, setDone] = useState(false);

  const taskId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("task_id");
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem("hottasks");
    if (!raw) return setDone(true);

    const tasks: Task[] = JSON.parse(raw);
    const updated = tasks.map((t) =>
      t.id === taskId ? { ...t, status: "Released" } : t
    );

    localStorage.setItem("hottasks", JSON.stringify(updated));
    setDone(true);
  }, [taskId]);

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="max-w-lg w-full rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="text-xs text-white/60">HOT Pay Redirect</div>
        <h1 className="mt-1 text-2xl font-bold">Payout sent (demo)</h1>

        <p className="mt-3 text-sm text-white/70">
          We marked the task as <span className="text-white font-semibold">Released</span>{" "}
          after HOT Pay redirect. Production version would verify via webhook/on-chain.
        </p>

        <div className="mt-4 text-sm text-white/70">
          Task ID: <span className="font-mono text-white">{taskId ?? "—"}</span>
        </div>

        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
          >
            Back to HOTTasks
          </Link>
        </div>

        <div className="mt-3 text-xs text-white/55">
          Status: {done ? "Updated ✅" : "Updating…"}
        </div>
      </div>
    </main>
  );
}
