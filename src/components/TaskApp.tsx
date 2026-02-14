"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { erc20Abi, formatUnits, isAddress } from "viem";
import { useAccount, useReadContract } from "wagmi";
import ConnectWallet from "@/components/ConnectWallet";

type CanonicalTaskStatus = "OPEN" | "CLAIMED" | "SUBMITTED" | "RELEASED";

type Task = {
  id: string;
  title: string;
  description: string;
  reward: number;
  status: string;
  creator: string;
  funded?: boolean;
  claimant?: string | null;
  createdAt: number;
};

const DEFAULT_CURRENCY_SYMBOL = "USDC";
const DEFAULT_USDC_TOKEN = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as const;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

function formatHot(n: number) {
  if (Number.isNaN(n)) return "0";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);
}

function shortAddress(value: string) {
  if (!value) return "guest";
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
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
  if (normalized === "OPEN" && task.claimant) return "CLAIMED";
  return normalized;
}

function prettyStatus(status: CanonicalTaskStatus) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function formatWalletBalance(value: bigint, decimals: number) {
  const parsed = Number(formatUnits(value, decimals));
  const valueNumber = Number.isFinite(parsed) ? parsed : 0;

  if (!Number.isFinite(valueNumber)) return "0";
  if (valueNumber === 0) return "0";

  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 }).format(valueNumber);
}

export default function TaskApp({ initialTasks }: { initialTasks: Task[] }) {
  const { address, isConnected } = useAccount();
  const rawTokenAddress = process.env.NEXT_PUBLIC_DEFAULT_CURRENCY_TOKEN_ADDRESS ?? DEFAULT_USDC_TOKEN;
  const usdcTokenAddress = isAddress(rawTokenAddress) ? rawTokenAddress : DEFAULT_USDC_TOKEN;
  const readEnabled = Boolean(isConnected && address);

  const { data: usdcRawBalance, isLoading: usdcBalanceLoading } = useReadContract({
    abi: erc20Abi,
    address: usdcTokenAddress,
    functionName: "balanceOf",
    args: [address ?? ZERO_ADDRESS],
    query: { enabled: readEnabled },
  });

  const { data: usdcDecimals } = useReadContract({
    abi: erc20Abi,
    address: usdcTokenAddress,
    functionName: "decimals",
    query: { enabled: readEnabled },
  });

  const { data: usdcSymbol } = useReadContract({
    abi: erc20Abi,
    address: usdcTokenAddress,
    functionName: "symbol",
    query: { enabled: readEnabled },
  });

  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [toast, setToast] = useState("");
  const [showBalance, setShowBalance] = useState(false);

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

    fetch("/api/tasks", {
      cache: "no-store",
      headers: {
        "x-wallet": address,
      },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((nextTasks: Task[]) => {
        setTasks(nextTasks);
      })
      .catch(() => null);
  }, [address, isConnected, initialTasks]);

  const stats = useMemo(() => {
    const fundedCount = tasks.filter((task) => task.funded).length;
    const openCount = tasks.filter((task) => taskStatus(task) === "OPEN").length;
    const claimedCount = tasks.filter((task) => taskStatus(task) === "CLAIMED").length;

    return {
      fundedCount,
      openCount,
      claimedCount,
    };
  }, [tasks]);

  const walletBalanceText = useMemo(() => {
    const symbol = typeof usdcSymbol === "string" && usdcSymbol.length > 0 ? usdcSymbol : DEFAULT_CURRENCY_SYMBOL;

    if (!isConnected || !address) return `0 ${DEFAULT_CURRENCY_SYMBOL}`;
    if (usdcBalanceLoading) return `Scanning ${symbol}...`;

    if (typeof usdcRawBalance !== "bigint" || typeof usdcDecimals !== "number") {
      return `0 ${symbol}`;
    }

    return `${formatWalletBalance(usdcRawBalance, usdcDecimals)} ${symbol}`;
  }, [address, isConnected, usdcBalanceLoading, usdcDecimals, usdcRawBalance, usdcSymbol]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 1500);
  }

  function jumpToCreate() {
    document.getElementById("create-mission")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  async function createTask() {
    if (!isConnected || !address) {
      alert("Connect your wallet to create a task.");
      return;
    }

    const rewardValue = Number(reward);
    if (!title.trim()) return alert("Add a task title.");
    if (!description.trim()) return alert("Add a description.");
    if (!Number.isFinite(rewardValue) || rewardValue <= 0) {
      return alert("Reward must be a number > 0.");
    }

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet": address,
        },
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
      showToast("Task created");
    } catch {
      alert("Failed to create task.");
    }
  }

  return (
    <main className="page hot-ui">
      {toast && <div className="toast">{toast}</div>}

      <div className="hot-bg-glow" aria-hidden="true" />
      <div className="container hot-shell">
        <header className="hot-header">
          <div className="hot-brand">
            <span className="hot-brand-fire" aria-hidden="true" />
            <div>
              <p className="hot-kicker">Community Marketplace</p>
              <h1 className="hot-title">HOTTasks</h1>
            </div>
          </div>
          <div className="wallet">
            <ConnectWallet />
          </div>
        </header>

        <section className="hot-balance-card">
          <div className="hot-balance-row">
            <div>
              <span className="hot-muted-label">Wallet Balance</span>
              <p className="hot-address">{shortAddress(address ?? "")}</p>
            </div>
            <button className="hot-eye-btn" onClick={() => setShowBalance((v) => !v)}>
              {showBalance ? "Hide balance" : "Show balance"}
            </button>
          </div>
          <div className="hot-balance-value">
            {showBalance ? walletBalanceText : "*****"}
          </div>
          <div className="hot-stats">
            <div className="hot-stat">
              <span>Funded</span>
              <strong>{stats.fundedCount}</strong>
            </div>
            <div className="hot-stat">
              <span>Open</span>
              <strong>{stats.openCount}</strong>
            </div>
            <div className="hot-stat">
              <span>Claimed</span>
              <strong>{stats.claimedCount}</strong>
            </div>
          </div>
          <div className="actions-row">
            <button className="btn primary hot-cta" onClick={jumpToCreate}>
              Post new task
            </button>
          </div>
        </section>

        <section className="panel hot-create-panel" id="create-mission">
          <div className="hot-section-head">
            <h2 className="section-title">Create Task</h2>
            <span className="pill">Escrow</span>
          </div>
          {isConnected && address ? (
            <>
              <div className="form-grid">
                <div>
                  <label className="label">Title</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="input"
                    placeholder="Build a landing page"
                  />
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="textarea"
                    placeholder="Define scope, deadline, and proof needed"
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
                  Launch mission
                </button>
              </div>
            </>
          ) : (
            <div className="actions-row">
              <p className="muted">Connect your wallet from the header to create a task.</p>
            </div>
          )}
        </section>

        <section className="hot-list-wrap">
          <div className="hot-list-head">
            <h2 className="section-title">Live Tasks</h2>
          </div>
          {tasks.length === 0 && (
            <div className="empty">
              <p>No tasks yet</p>
              <span>Create the first bounty to get started</span>
            </div>
          )}

          {tasks.map((task) => {
            const status = taskStatus(task);
            return (
              <article key={task.id} className="hot-task-row">
                <div className="hot-task-main">
                  <div className="hot-task-title-row">
                    <h3 className="task-title">{task.title}</h3>
                    <span className={`badge ${status.toLowerCase()}`}>{prettyStatus(status)}</span>
                  </div>
                  <p className="desc">{task.description}</p>
                  <div className="meta">Creator {shortAddress(task.creator)}</div>
                  {task.claimant && <div className="meta">Claimed by {shortAddress(task.claimant)}</div>}
                </div>
                <div className="hot-task-side">
                  <strong className="reward">{formatHot(task.reward)} HOT</strong>
                  <Link className="btn primary open-task-link task-details-link" href={`/tasks/${task.id}`}>
                    Task details
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
