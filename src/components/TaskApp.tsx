"use client";

import { useEffect, useState } from "react";
import ConnectWallet from "@/components/ConnectWallet";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";

type CanonicalTaskStatus = "OPEN" | "CLAIMED" | "SUBMITTED" | "RELEASED";

type Task = {
  id: string;
  title: string;
  description: string;
  reward: number;
  status: string;
  creator: string;
  funded?: boolean;
  txHash?: string | null;
  claimant?: string | null;
  payoutItemId?: string | null;
  createdAt: number;
};

function formatHot(n: number) {
  if (Number.isNaN(n)) return "0";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);
}

function normalizeStatus(status: string | null | undefined): CanonicalTaskStatus {
  const upper = (status ?? "").toUpperCase();
  if (upper === "OPEN" || upper === "CLAIMED" || upper === "SUBMITTED" || upper === "RELEASED") {
    return upper;
  }
  return "OPEN";
}

function taskStatus(task: Pick<Task, "status" | "claimant">): CanonicalTaskStatus {
  const normalized = normalizeStatus(task.status);
  // Handle legacy rows where claimant exists but status was stored as "Open".
  if (normalized === "OPEN" && task.claimant) return "CLAIMED";
  return normalized;
}

function prettyStatus(status: CanonicalTaskStatus) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export default function TaskApp({ initialTasks }: { initialTasks: Task[] }) {
  const { address, isConnected } = useAccount();
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
    if (!isConnected || !address) {
      setTasks(initialTasks);
      return;
    }
    fetch("/api/tasks/mine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress: address }),
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((mineTasks: Task[]) => {
        const merged = new Map(initialTasks.map((task) => [task.id, task]));
        for (const task of mineTasks) merged.set(task.id, task);
        setTasks(
          Array.from(merged.values()).sort((a, b) => b.createdAt - a.createdAt)
        );
      })
      .catch(() => null);
  }, [address, initialTasks, isConnected]);

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
    if (!isConnected || !address) {
      alert("Connect your wallet to create a task.");
      return;
    }

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
          walletAddress: address,
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
      showToast("Task created");
    } catch {
      alert("Failed to create task.");
    }
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

  async function fundTask(task: Task) {
    if (!isConnected || !address) {
      alert("Connect your wallet first.");
      return;
    }

    const txHash = prompt("Paste funding transaction hash:");
    if (!txHash) return;

    setLoadingAction({ id: task.id, action: "fund" });
    try {
      const res = await fetch(`/api/tasks/${task.id}/fund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txHash: txHash.trim(),
          walletAddress: address,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Funding failed");
        return;
      }

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
    const status = taskStatus(task);

    if (!task.funded) {
      const loading = isLoading(task.id, "fund");

      if (!address || address.toLowerCase() !== task.creator.toLowerCase()) {
        return <span className="hint">Waiting for creator funding</span>;
      }

      return (
        <button className="btn" onClick={() => fundTask(task)} disabled={loading}>
          {loading ? "Funding..." : "Fund task"}
        </button>
      );
    }

    if (status === "OPEN" && !task.claimant) {
      const loading = isLoading(task.id, "claim");
      return (
        <button className="btn primary" onClick={() => claimTask(task.id)} disabled={loading}>
          {loading ? "Claiming..." : "Claim"}
        </button>
      );
    }

    if (status === "CLAIMED") {
      const loading = isLoading(task.id, "submit");
      return (
        <button className="btn" onClick={() => submitProof(task.id)} disabled={loading}>
          {loading ? "Submitting..." : "Submit proof"}
        </button>
      );
    }

    if (status === "SUBMITTED") {
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
              <ConnectWallet />
            </div>
          </div>
          <p className="tagline">Post a small task. Fund escrow. Get it solved instantly.</p>
        </div>
      </header>

      <div className="container">
        <section className="panel">
          <h2 className="section-title">Create a task</h2>
          <p className="muted">Post a task, fund escrow, and let someone claim it.</p>

          {isConnected ? (
            <>
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
                  Create task
                </button>
                <span className="hint">Funding requires a transaction hash.</span>
              </div>
            </>
          ) : (
            <p className="muted">Connect wallet to create a task.</p>
          )}
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
              <strong>{tasks.filter((t) => taskStatus(t) === "OPEN").length}</strong>
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
            {tasks.map((task) => {
              const status = taskStatus(task);
              return (
                <div key={task.id} className="task-card">
                  <div className="task-top">
                    <h3 className="task-title">{task.title}</h3>
                    <span className={`badge ${status.toLowerCase()}`}>
                      {prettyStatus(status)}
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
              );
            })}
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


