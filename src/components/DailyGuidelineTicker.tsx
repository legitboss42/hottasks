"use client";

import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "hot_guideline_seen_date";

function todayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function DailyGuidelineTicker() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const key = todayKey();
    const lastSeen = window.localStorage.getItem(STORAGE_KEY);

    if (lastSeen === key) return;

    window.localStorage.setItem(STORAGE_KEY, key);
    const showTimer = window.setTimeout(() => setVisible(true), 0);
    const hideTimer = window.setTimeout(() => setVisible(false), 15000);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  const message = useMemo(
    () =>
      "Quick guide: Connect wallet, create or fund tasks, claim an open task, submit proof, and wait for creator release.",
    []
  );

  if (!visible) return null;

  return (
    <aside className="daily-guide" role="status" aria-live="polite">
      <div className="daily-guide-viewport">
        <div className="daily-guide-track">
          <span>{message}</span>
          <span aria-hidden="true">{message}</span>
        </div>
      </div>
      <button
        className="daily-guide-close"
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Dismiss guideline"
      >
        x
      </button>
    </aside>
  );
}
