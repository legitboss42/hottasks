"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/components/WalletProvider";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [toast, setToast] = useState("");
  const [loadingAction, setLoadingAction] = useState<{
    id: string;
    action: "fund" | "claim" | "submit" | "release";
  } | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reward, setReward] = useState<string>("");

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  useEffect(() => {
    if (initialTasks.length > 0) return;
    fetch("/api/seed", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (data?.seeded) router.refresh();
      })
      .catch(() => null);
  }, [initialTasks.length, router]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 1500);
  }

  function isLoading(id: string, action: "fund" | "claim" | "submit" | "release") {
    return loadingAction?.id === id && loadingAction?.action === action;
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

  async function claimTask(id: string) {
    setLoadingAction({ id, action: "claim" });
    try {
      const res = await fetch(`/api/tasks/${id}/claim`, { method: "POST" });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Claim failed");
        return;
      }

      showToast("Task claimed");
      router.refresh();
    } finally {
      setLoadingAction(null);
    }
  }

  async function markFunded(id: string) {
    setLoadingAction({ id, action: "fund" });
    try {
      await fetch(`/api/tasks/${id}/fund`, { method: "POST" });
      showToast("Task funded");
      router.refresh();
    } finally {
      setLoadingAction(null);
    }
  }

  async function submitProof(id: string) {
    const proof = prompt("Paste proof link or message:");
    if (!proof) return;

    setLoadingAction({ id, action: "submit" });
    try {
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

      showToast("Proof submitted");
      router.refresh();
    } finally {
      setLoadingAction(null);
    }
  }

  async function releaseTask(id: string) {
    setLoadingAction({ id, action: "release" });
    try {
      const res = await fetch(`/api/tasks/${id}/release`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Release failed");
        return;
      }
      showToast("Payout released");
      router.refresh();
    } finally {
      setLoadingAction(null);
    }
  }

  function renderAction(task: Task) {
    if (!task.funded) {
      const loading = isLoading(task.id, "fund");
      return (
        <button className="btn" onClick={() => markFunded(task.id)} disabled={loading}>
          {loading ? "Funding..." : "Mark funded (dev)"}
        </button>
      );
    }

    if (task.status === "Open" && !task.claimant) {
      const loading = isLoading(task.id, "claim");
      return (
        <button className="btn primary" onClick={() => claimTask(task.id)} disabled={loading}>
          {loading ? "Claiming..." : "Claim"}
        </button>
      );
    }

    if (task.status === "Claimed") {
      const loading = isLoading(task.id, "submit");
      return (
        <button className="btn" onClick={() => submitProof(task.id)} disabled={loading}>
          {loading ? "Submitting..." : "Submit proof"}
        </button>
      );
    }

    if (task.status === "Submitted") {
      const loading = isLoading(task.id, "release");
      return (
        <button className="btn" onClick={() => releaseTask(task.id)} disabled={loading}>
          {loading ? "Releasing..." : "Release payout"}
        </button>
      );
    }

    return null;
  }

  return (
    <main className="page">
      {toast && <div className="toast">{toast}</div>}
      <header className="hero">
        <div className="container">
          <div className="header-bar">
            <h1 className="logo">🔥 HOTTasks</h1>
            <div className="wallet">
              {accountId ? (
                <button className="wallet-chip" onClick={disconnect} title="Disconnect">
                  {accountId.slice(0, 6)}…{accountId.slice(-4)}
                </button>
              ) : (
                <button className="btn" onClick={connect}>
                  Connect
                </button>
              )}
            </div>
          </div>
          <p className="tagline">Post a small task. Fund escrow. Get it solved instantly.</p>
        </div>
      </header>

      <div className="container">
        <section className="panel">
          <h2 className="section-title">Create a task</h2>
          <p className="muted">Post a task, fund escrow, and let someone claim it.</p>

          <div className="form-grid">
            <div>
              <label className="label">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input"
                placeholder="Fix a UI bug on my landing page"
              />
            </div>

            <div>
              <label className="label">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="textarea"
                placeholder="What needs to be done? What proof do you need?"
                rows={4}
              />
            </div>

            <div>
              <label className="label">Reward</label>
              <input
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                className="input"
                placeholder="55"
                inputMode="decimal"
              />
            </div>
          </div>

          <div className="actions-row">
            <button className="btn primary" onClick={createTask}>
              Create & Fund
            </button>
            <span className="hint">Demo escrow for hackathon testing.</span>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2 className="section-title">Tasks</h2>
            <span className="pill">{tasks.length} total</span>
          </div>

          <div className="stats">
            <div>
              <strong>{tasks.length}</strong>
              <span>Total</span>
            </div>
            <div>
              <strong>{tasks.filter((t) => t.funded).length}</strong>
              <span>Funded</span>
            </div>
            <div>
              <strong>{tasks.filter((t) => t.status === "Open").length}</strong>
              <span>Open</span>
            </div>
          </div>

          <div className="task-list">
            {tasks.length === 0 && (
              <div className="empty">
                <p>No tasks yet</p>
                <span>Create the first bounty to get started</span>
              </div>
            )}
            {tasks.map((task) => (
              <div key={task.id} className="task-card">
                <div className="task-top">
                  <h3 className="task-title">{task.title}</h3>
                  <span className={`badge ${task.status.toLowerCase()}`}>
                    {task.status}
                  </span>
                </div>

                <p className="desc">{task.description}</p>

                {task.claimant && (
                  <div className="meta">Claimed by {task.claimant}</div>
                )}

                <div className="task-bottom">
                  <strong className="reward">{formatHot(task.reward)} HOT</strong>
                  {renderAction(task)}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <footer className="footer">
        <div className="container footer-inner">
          Built for NEARCON Innovation Sandbox · HOT Pay micro-bounties demo
        </div>
      </footer>
    </main>
  );
}


