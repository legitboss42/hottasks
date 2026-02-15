import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { Task as DbTask } from "@prisma/client";
import ConnectWallet from "@/components/ConnectWallet";
import TaskDetailActions from "@/components/TaskDetailActions";
import { prisma } from "@/lib/prisma";
import { readWalletAddressFromCookieStore } from "@/lib/auth";

export const dynamic = "force-dynamic";

const validStatuses = ["OPEN", "CLAIMED", "SUBMITTED", "RELEASED"] as const;
type TaskStatus = (typeof validStatuses)[number];

function normalizeStatus(status: unknown): TaskStatus {
  const upper = String(status ?? "").toUpperCase();
  return (validStatuses as readonly string[]).includes(upper) ? (upper as TaskStatus) : "OPEN";
}

function formatHot(n: number) {
  if (Number.isNaN(n)) return "0";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);
}

function statusText(status: TaskStatus) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) notFound();

  const cookieStore = await cookies();
  const viewerWallet = readWalletAddressFromCookieStore(cookieStore) ?? "";
  const creatorWallet = task.creator.toLowerCase();
  const isCreator = viewerWallet !== "" && viewerWallet === creatorWallet;

  if (!task.funded && !isCreator) {
    return (
      <main className="page">
        <header className="hero">
          <div className="container">
            <div className="header-bar">
              <h1 className="logo">
                <Link href="/" className="logo-link">
                  HOTTasks
                </Link>
              </h1>
              <div className="wallet">
                <ConnectWallet />
              </div>
            </div>
          </div>
        </header>

        <div className="container">
          <section className="panel locked-panel">
            <h2 className="section-title">Task locked</h2>
            <p className="muted">This task is not funded yet. Only the creator can view it.</p>
            <Link href="/" className="btn open-task-link">
              Back to tasks
            </Link>
          </section>
        </div>
      </main>
    );
  }

  const normalizedStatus = normalizeStatus((task as DbTask).status);
  const effectiveStatus: TaskStatus =
    normalizedStatus === "OPEN" && task.claimant ? "CLAIMED" : normalizedStatus;

  return (
    <main className="page">
      <header className="hero">
        <div className="container">
          <div className="header-bar">
            <h1 className="logo">
              <Link href="/" className="logo-link">
                HOTTasks
              </Link>
            </h1>
            <div className="wallet">
              <ConnectWallet />
            </div>
          </div>
          <p className="tagline">Task detail and action controls.</p>
        </div>
      </header>

      <div className="container">
        <section className="panel task-detail-panel">
          <div className="task-detail-top">
            <h2 className="task-detail-title">{task.title}</h2>
            <span className={`badge ${effectiveStatus.toLowerCase()}`}>{statusText(effectiveStatus)}</span>
          </div>

          <p className="task-detail-description">{task.description}</p>

          <dl className="task-detail-grid">
            <div>
              <dt>Reward</dt>
              <dd>{formatHot(task.reward)} HOT</dd>
            </div>
            <div>
              <dt>Funding</dt>
              <dd>{task.funded ? "Funded" : "Unfunded"}</dd>
            </div>
            <div>
              <dt>Creator</dt>
              <dd>{task.creator}</dd>
            </div>
            <div>
              <dt>Claimant</dt>
              <dd>{task.claimant ?? "Not claimed"}</dd>
            </div>
          </dl>

          <div className="task-detail-actions">
            <TaskDetailActions
              id={task.id}
              funded={task.funded}
              status={effectiveStatus}
              claimant={task.claimant}
              creator={task.creator}
              reward={task.reward}
            />
            <Link href="/" className="btn open-task-link">
              Back
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}


