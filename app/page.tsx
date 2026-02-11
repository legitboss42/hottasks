"use client";

import { useEffect, useMemo, useState } from "react";

type TaskStatus = "Open" | "Claimed" | "Submitted" | "Released";

type Task = {
  id: string;
  title: string;
  description: string;
  rewardHot: number;
  status: TaskStatus;
  funded?: boolean;

  claimant?: string;
  payoutItemId?: string; // worker’s HOT Pay product/item id

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

export default function Home() {
  const initialTasks = useMemo<Task[]>(
    () => [
      {
        id: "t1",
        title: "Fix a CSS overflow issue",
        description:
          "Navbar overlaps on mobile. Provide before/after screenshot + PR link.",
        rewardHot: 35,
        status: "Open",
        funded: false,
        createdAt: Date.now() - 1000 * 60 * 60 * 6,
      },
      {
        id: "t2",
        title: "Write a landing page headline",
        description:
          "Need 5 headline options for an aesthetic clinic homepage. Drop them in a doc.",
        rewardHot: 20,
        status: "Open",
        funded: false,
        createdAt: Date.now() - 1000 * 60 * 60 * 3,
      },
    ],
    []
  );

  const [connected, setConnected] = useState(false);

  // Persisted tasks
  const [tasks, setTasks] = useState<Task[]>([]);
  useEffect(() => {
    const saved = localStorage.getItem("hottasks");
    if (saved) setTasks(JSON.parse(saved));
    else setTasks(initialTasks);
  }, [initialTasks]);

  useEffect(() => {
    localStorage.setItem("hottasks", JSON.stringify(tasks));
  }, [tasks]);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reward, setReward] = useState<string>("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    if (!selectedId && tasks[0]?.id) setSelectedId(tasks[0].id);
  }, [tasks, selectedId]);

  const selectedTask = tasks.find((t) => t.id === selectedId) ?? null;

  // Claim modal state (replaces prompt())
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimant, setClaimant] = useState("");
  const [payoutItemId, setPayoutItemId] = useState("");

  function updateTask(id: string, patch: Partial<Task>) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function createTask() {
    const rewardHot = Number(reward);
    if (!title.trim()) return alert("Add a task title.");
    if (!description.trim()) return alert("Add a description.");
    if (!Number.isFinite(rewardHot) || rewardHot <= 0)
      return alert("Reward must be a number > 0.");

    const t: Task = {
      id: crypto.randomUUID(),
      title: title.trim(),
      description: description.trim(),
      rewardHot,
      status: "Open",
      funded: false,
      createdAt: Date.now(),
    };

    setTasks((prev) => [t, ...prev]);
    setSelectedId(t.id);
    setTitle("");
    setDescription("");
    setReward("");

    // Smooth demo: immediately fund after create
    lockHotForTask(t);
  }

  function lockHotForTask(task: Task) {
    const itemId = process.env.NEXT_PUBLIC_HOTPAY_ITEM_ID;
    if (!itemId) return alert("Missing NEXT_PUBLIC_HOTPAY_ITEM_ID in .env.local");

    const redirectUrl = `${window.location.origin}/pay/success?task_id=${encodeURIComponent(
      task.id
    )}`;

    const url = buildHotPayUrl({
      itemId,
      amount: task.rewardHot,
      redirectUrl,
    });

    window.location.href = url;
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
      amount: task.rewardHot,
      redirectUrl,
    });

    window.location.href = url;
  }

  function openClaimModal() {
    if (!selectedTask) return;
    if (!selectedTask.funded) return alert("Task is not funded yet.");
    if (!connected) return alert("Connect wallet first (demo toggle).");

    // Prefill if already claimed (optional)
    setClaimant(selectedTask.claimant ?? "");
    setPayoutItemId(selectedTask.payoutItemId ?? "");
    setClaimOpen(true);
  }

  function confirmClaim() {
    if (!selectedTask) return;
    const c = claimant.trim();
    const pid = payoutItemId.trim();

    if (!c) return alert("Enter claimant name/handle.");
    if (!pid) return alert("Enter worker HOT Pay Product ID (item_id).");

    updateTask(selectedTask.id, {
      status: "Claimed",
      claimant: c,
      payoutItemId: pid,
    });

    setClaimOpen(false);
  }

  function submitProof() {
    if (!selectedTask) return;
    if (!selectedTask.funded) return alert("Task is not funded yet.");
    if (selectedTask.status !== "Claimed") return alert("Task must be Claimed first.");
    updateTask(selectedTask.id, { status: "Submitted" });
  }

  function release() {
    if (!selectedTask) return;
    if (!selectedTask.funded) return alert("Task is not funded yet.");
    if (selectedTask.status !== "Submitted")
      return alert("Task must be Submitted before release.");
    releasePayout(selectedTask);
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
            onClick={() => setConnected((v) => !v)}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10"
          >
            {connected ? "Wallet Connected" : "Connect Wallet"}
          </button>
        </div>
      </header>

      {/* Body */}
      <section className="mx-auto grid max-w-5xl gap-8 px-4 py-10 md:grid-cols-2">
        {/* Create Task */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">Create a task</h2>
          <p className="mt-1 text-sm text-white/70">
            Create → HOT Pay funds escrow → redirect back → claim/release flow.
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
                        Reward: {formatHot(t.rewardHot)}{" "}
                        <span className="text-white/50">HOT/USDC</span>
                      </div>
                      <div className="mt-1 text-xs text-white/60">
                        Escrow:{" "}
                        {t.funded ? (
                          <span className="text-white font-semibold">Funded ✅</span>
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
                        {formatHot(selectedTask.rewardHot)}
                      </span>
                    </div>

                    <div className="mt-2 text-sm text-white/70">
                      Escrow:{" "}
                      {selectedTask.funded ? (
                        <span className="font-semibold text-white">Funded ✅</span>
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
                    disabled={!connected}
                    className="w-full mt-4 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    title={!connected ? "Connect wallet first (demo toggle)" : ""}
                  >
                    Fund escrow (HOT Pay)
                  </button>
                )}

                {/* Action buttons */}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <button
                    onClick={openClaimModal}
                    disabled={
                      !connected ||
                      !selectedTask.funded ||
                      selectedTask.status !== "Open"
                    }
                    className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Claim
                  </button>

                  <button
                    onClick={submitProof}
                    disabled={
                      !connected ||
                      !selectedTask.funded ||
                      selectedTask.status !== "Claimed"
                    }
                    className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Submit
                  </button>

                  <button
                    onClick={release}
                    disabled={
                      !connected ||
                      !selectedTask.funded ||
                      selectedTask.status !== "Submitted"
                    }
                    className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Release
                  </button>
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

      {/* Claim Modal */}
      {claimOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-950 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs text-white/60">Claim task</div>
                <div className="text-lg font-semibold">
                  {selectedTask?.title ?? "—"}
                </div>
              </div>

              <button
                onClick={() => setClaimOpen(false)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-white/60">Claimant name/handle</label>
                <input
                  value={claimant}
                  onChange={(e) => setClaimant(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/25"
                  placeholder="e.g., @dev_john"
                />
              </div>

              <div>
                <label className="text-xs text-white/60">
                  Worker HOT Pay Product ID (item_id)
                </label>
                <input
                  value={payoutItemId}
                  onChange={(e) => setPayoutItemId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/25"
                  placeholder="paste worker’s product id here"
                />
                <div className="mt-1 text-xs text-white/55">
                  For demo, paste your own Product ID so payout redirects work.
                </div>
              </div>

              <button
                onClick={confirmClaim}
                className="mt-2 w-full rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
              >
                Confirm Claim
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="border-t border-white/10 py-6">
        <div className="mx-auto max-w-5xl px-4 text-xs text-white/50">
          Built for NEARCON Innovation Sandbox · HOT Pay micro-bounties demo
        </div>
      </footer>
    </main>
  );
}