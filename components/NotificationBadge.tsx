"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function formatBadgeCount(n: number): string | null {
  if (n <= 0) return null;
  if (n <= 99) return String(n);
  return "99+";
}

export default function NotificationBadge() {
  const [count, setCount] = useState(0);
  const router = useRouter();
  const esRef = useRef<EventSource | null>(null);

  const fetchCount = async () => {
    try {
      const res = await fetch("/api/notifications/unread-count");
      if (res.ok) {
        const data = await res.json();
        setCount(data.count ?? 0);
      }
    } catch {}
  };

  useEffect(() => {
    fetchCount();

    const es = new EventSource("/api/notifications/stream");
    esRef.current = es;

    es.addEventListener("new-notification", () => {
      setCount((c) => c + 1);
    });

    es.addEventListener("notification-deleted", () => {
      fetchCount();
    });

    // 监听通知列表页的已读操作，重新拉取未读数
    const handleRefresh = () => fetchCount();
    window.addEventListener("notification-read", handleRefresh);

    return () => {
      es.close();
      esRef.current = null;
      window.removeEventListener("notification-read", handleRefresh);
    };
  }, []);

  const badge = formatBadgeCount(count);

  return (
    <button
      onClick={() => router.push("/notifications")}
      className="relative flex items-center justify-center w-8 h-8 rounded-md border border-th-border bg-th-bg text-th-text2 hover:text-th-text hover:border-[#58a6ff]/50 transition-all"
      title="通知"
    >
      {/* Bell icon */}
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      {badge && (
        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 flex items-center justify-center rounded-full bg-[#f85149] text-white text-[10px] font-bold leading-none">
          {badge}
        </span>
      )}
    </button>
  );
}
