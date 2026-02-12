"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function PaySuccessClient({ taskId }: { taskId: string | null }) {
  useEffect(() => {
    if (!taskId) return;
    void fetch(`/api/tasks/${encodeURIComponent(taskId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ funded: true }),
    });
  }, [taskId]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Payment Successful ?</h1>
        <p>Your HOT escrow has been funded.</p>
        <Link href="/" className="underline mt-6 block">
          Back home
        </Link>
      </div>
    </main>
  );
}
