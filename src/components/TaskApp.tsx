"use client";

import { useState } from "react";
import { useWallet } from "@/components/WalletProvider";

type TaskStatus = "Open" | "Claimed" | "Submitted" | "Released";

type Task = {
  id: string;
  title: string;
  description: string;
  reward: number;
  status: TaskStatus;
  funded?: boolean;
  claimant?: string | null;
  payoutItemId?: string | null;
  createdAt: number;
};

function formatHot(n: number) {
  if (Number.isNaN(n)) return "0";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);
}

function buildHotPayUrl(args: { itemId: string; amount: number; redirectUrl: string }) {
  const u = new URL("https://pay.hot-labs.org/payment");
  u.searchParams.set("item_id", args.itemId);
  u.searchParams.set("amount", String(args.amount));
  u.searchParams.set("redirect_url", args.redirectUrl);
  return u.toString();
}

export default function TaskApp({ initialTasks }: { initialTasks: Task[] }) {
  const { accountId, connect, disconnect } = useWallet();

  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reward, setReward] = useState<string>("");

  const [selectedId, setSelectedId] = useState<string | null>(
    initialTasks[0]?.id ?? null
  );

  const selectedTask = tasks.find((t) => t.id === selectedId) ?? null;

  async function updateTask(id: string, patch: Partial<Task>) {
    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err?.error ?? "Failed to update task.");
        return;
      }

      const updated: Task = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch {
      alert("Failed to update task.");
    }
  }

  async function createTask() {
    const rewardValue = Number(reward);
    if (!title.trim()) return alert("Add a task title.");
    if (!description.trim()) return alert("Add a description.");
    if (!Number.isFinite(rewardValue) || rewardValue <= 0)
      return alert("Reward must be a number > 0.");

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          reward: rewardValue,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err?.error ?? "Failed to create task.");
        return;
      }

      const created: Task = await res.json();
      setTasks((prev) => [created, ...prev]);
      setSelectedId(created.id);
      setTitle("");
      setDescription("");
      setReward("");

      // Smooth demo: immediately fund after create
      lockHotForTask(created);
    } catch {
      alert("Failed to create task.");
    }
  }

  function lockHotForTask(task: Task) {
    const itemId = process.env.NEXT_PUBLIC_HOTPAY_ITEM_ID;
    if (!itemId) return alert("Missing NEXT_PUBLIC_HOTPAY_ITEM_ID in .env.local");

    const redirect = new URL("/pay/success", window.location.origin);
    redirect.searchParams.set("taskId", task.id);
    redirect.searchParams.set("payoutItemId", itemId);
    const redirectUrl = redirect.toString();

    const url = buildHotPayUrl({
      itemId,
      amount: task.reward,
      redirectUrl,
    });

    window.location.assign(url);
  }

  function releasePayout(task: Task) {
    const itemId = task.payoutItemId || "";
    if (!itemId) {
      alert("Missing worker payout Product ID (item_id). Claim the task and add it.");
      return;
    }

    const redirectUrl = `${window.location.origin}/pay/payout-success?task_id=${encodeURIComponent(
      task.id
    )}`;

    const url = buildHotPayUrl({
      itemId,
      amount: task.reward,
      redirectUrl,
    });

    window.location.assign(url);
  }

  async function claimTask(id: string) {
    const res = await fetch(`/api/tasks/${id}/claim`, { method: "POST" });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Claim failed");
      return;
    }

    location.reload(); // simple + reliable for hackathon
  }

  async function markFunded(id: string) {
    await fetch(`/api/tasks/${id}/fund`, { method: "POST" });
    location.reload();
  }

  async function submitProof(id: string) {
    const proof = prompt("Paste proof link or message:");
    if (!proof) return;

    const res = await fetch(`/api/tasks/${id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proofUrl: proof }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Submit failed");
      return;
    }

    location.reload();
  }

  async function releaseTask(id: string) {
    const res = await fetch(`/api/tasks/${id}/release`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Release failed");
      return;
    }
    location.reload();
  }

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-white/10 bg-black/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
          <div>
            <div className="text-xs text-white/60">NEAR · HOT Pay</div>
            <h1 className="text-xl font-bold">🔥 HOTTasks</h1>
          </div>

          <button
            onClick={accountId ? disconnect : connect}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10"
          >
            {accountId ? `${accountId.slice(0, 10)}…` : "Connect Wallet"}
          </button>
        </div>
      </header>

      {/* Body */}
      <section className="mx-auto grid max-w-5xl gap-8 px-4 py-10 md:grid-cols-2">
        {/* Create Task */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">Create a task</h2>
          <p className="mt-1 text-sm text-white/70">
            Create ? HOT Pay funds escrow ? redirect back ? claim/release flow.
          </p>

          <div className="mt-5 space-y-3">
            <div>
              <label className="text-xs text-white/60">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/25"
                placeholder="e.g., Fix a UI bug on my landing page"
              />
            </div>

            <div>
              <label className="text-xs text-white/60">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/25"
                placeholder="What needs to be done? What proof do you need?"
                rows={4}
              />
            </div>

            <div>
              <label className="text-xs text-white/60">Reward</label>
              <input
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/25"
                placeholder="55"
                inputMode="decimal"
              />
            </div>

            <button
              onClick={createTask}
              className="mt-2 w-full rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
            >
              Create & Fund (HOT Pay)
            </button>

            <div className="text-xs text-white/55">
              This is demo-grade escrow. Production uses webhooks/on-chain verification.
            </div>
          </div>
        </div>

        {/* Tasks */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Tasks</h2>
            <span className="rounded-full border border-white/10 bg-black/30 px-2 py-1 text-xs text-white/70">
              {tasks.length} total
            </span>
          </div>

          <div className="mt-4 grid gap-3">
            {tasks.map((t) => {
              const active = t.id === selectedId;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={[
                    "rounded-2xl border p-4 text-left transition",
                    active
                      ? "border-white/25 bg-white/10"
                      : "border-white/10 bg-black/30 hover:bg-white/5",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{t.title}</div>
                      <div className="mt-1 text-sm text-white/70">
                        Reward: {formatHot(t.reward)}{" "}
                        <span className="text-white/50">HOT/USDC</span>
                      </div>
                      <div className="mt-1 text-xs text-white/60">
                        Escrow:{" "}
                        {t.funded ? (
                          <span className="text-white font-semibold">Funded ?</span>
                        ) : (
                          <span className="text-white/70">Not funded</span>
                        )}
                      </div>
                    </div>

                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80">
                      {t.status}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected task panel */}
          <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
            {selectedTask ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-white/60">Selected</div>
                    <div className="text-lg font-semibold">{selectedTask.title}</div>
                    <div className="mt-2 text-sm text-white/70">
                      {selectedTask.description}
                    </div>

                    <div className="mt-3 text-sm text-white/70">
                      Reward:{" "}
                      <span className="font-semibold text-white">
                        {formatHot(selectedTask.reward)}
                      </span>
                    </div>

                    <div className="mt-2 text-sm text-white/70">
                      Escrow:{" "}
                      {selectedTask.funded ? (
                        <span className="font-semibold text-white">Funded ?</span>
                      ) : (
                        <span className="font-semibold text-white/70">Not funded</span>
                      )}
                    </div>

                    <div className="mt-2 text-sm text-white/70">
                      Claimed by:{" "}
                      <span className="font-semibold text-white">
                        {selectedTask.claimant ?? "—"}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-white/60">Status</div>
                    <div className="mt-1 text-sm font-semibold">
                      {selectedTask.status}
                    </div>
                  </div>
                </div>

                {/* Funding button */}
                {!selectedTask.funded && (
                  <button
                    onClick={() => lockHotForTask(selectedTask)}
                    disabled={!accountId}
                    className="w-full mt-4 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    title={!accountId ? "Connect wallet first (demo toggle)" : ""}
                  >
                    Fund escrow (HOT Pay)
                  </button>
                )}

                {!selectedTask.funded && (
                  <button
                    onClick={() => markFunded(selectedTask.id)}
                    className="w-full mt-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
                  >
                    Mark funded (dev)
                  </button>
                )}

                {/* Action buttons */}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {selectedTask.funded &&
                    selectedTask.status === "Open" &&
                    !selectedTask.claimant && (
                    <button
                      onClick={() => claimTask(selectedTask.id)}
                      className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-black hover:opacity-90"
                    >
                      Claim
                    </button>
                  )}

                  {selectedTask.status === "Claimed" && (
                    <button
                      onClick={() => submitProof(selectedTask.id)}
                      className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
                    >
                      Submit proof
                    </button>
                  )}

                  {selectedTask.status === "Submitted" && (
                    <button
                      onClick={() => releaseTask(selectedTask.id)}
                      className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
                    >
                      Release payout
                    </button>
                  )}
                </div>

                <div className="mt-3 text-xs text-white/55">
                  Release opens HOT Pay payout using the worker’s Product ID (item_id).
                </div>
              </>
            ) : (
              <div className="text-sm text-white/70">Select a task to see details.</div>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-6">
        <div className="mx-auto max-w-5xl px-4 text-xs text-white/50">
          Built for NEARCON Innovation Sandbox · HOT Pay micro-bounties demo
        </div>
      </footer>
    </main>
  );
}


