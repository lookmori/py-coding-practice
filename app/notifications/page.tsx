"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface NotificationItem {
  id: string;
  sessionType: "exam" | "practice";
  sessionId: string;
  answerId: string;
  questionContent: string;
  isRead: boolean;
  createdAt: string;
}

interface ListResponse {
  items: NotificationItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function NotificationsPage() {
  const router = useRouter();
  const [data, setData] = useState<ListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchList = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?page=${p}&pageSize=20`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList(page);
  }, [page, fetchList]);

  const handleMarkRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    window.dispatchEvent(new Event("notification-read"));
    fetchList(page);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    window.dispatchEvent(new Event("notification-read"));
    fetchList(page);
  };

  const handleMarkAllRead = async () => {
    await fetch("/api/notifications/read-all", { method: "PATCH" });
    window.dispatchEvent(new Event("notification-read"));
    fetchList(page);
  };

  const handleDeleteRead = async () => {
    await fetch("/api/notifications/read", { method: "DELETE" });
    window.dispatchEvent(new Event("notification-read"));
    setPage(1);
    fetchList(1);
  };

  const handleClickItem = async (item: NotificationItem) => {
    if (!item.isRead) {
      await fetch(`/api/notifications/${item.id}/read`, { method: "PATCH" });
      window.dispatchEvent(new Event("notification-read"));
    }
    const url = item.sessionType === "exam"
      ? `/records/exam/${item.sessionId}`
      : `/records/practice/${item.sessionId}`;
    router.push(url);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-th-text mb-6">通知</h1>

      {/* Actions bar */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={handleMarkAllRead}
          className="text-sm px-3 py-1.5 rounded-md border border-th-border text-th-text2 hover:text-th-text hover:border-[#58a6ff]/50 transition-all"
        >
          全部标记已读
        </button>
        <button
          onClick={handleDeleteRead}
          className="text-sm px-3 py-1.5 rounded-md border border-th-border text-th-text2 hover:text-[#f85149] hover:border-[#f85149]/50 transition-all"
        >
          删除已读
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-th-text2 text-sm py-8 text-center">加载中...</div>
      ) : !data || data.items.length === 0 ? (
        <div className="text-th-text2 text-sm py-8 text-center">暂无通知</div>
      ) : (
        <ul className="space-y-2">
          {data.items.map((item) => (
            <li
              key={item.id}
              className={`flex items-start gap-3 p-4 rounded-lg border transition-all ${
                item.isRead
                  ? "border-th-border bg-th-bg"
                  : "border-[#58a6ff]/40 bg-[#388bfd]/5"
              }`}
            >
              {/* Unread dot */}
              <div className="mt-1.5 flex-shrink-0">
                {!item.isRead && (
                  <span className="block w-2 h-2 rounded-full bg-[#58a6ff]" />
                )}
                {item.isRead && <span className="block w-2 h-2" />}
              </div>

              {/* Content */}
              <div
                className="flex-1 cursor-pointer"
                onClick={() => handleClickItem(item)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                    item.sessionType === "exam"
                      ? "bg-[#388bfd]/20 text-[#58a6ff]"
                      : "bg-[#3fb950]/20 text-[#3fb950]"
                  }`}>
                    {item.sessionType === "exam" ? "考试" : "练习"}
                  </span>
                  <span className="text-xs text-th-text2">{formatTime(item.createdAt)}</span>
                </div>
                <p className="text-sm text-th-text line-clamp-2">
                  您的答题已被批改：{item.questionContent}
                </p>
              </div>

              {/* Actions */}
              <div className="flex-shrink-0 flex gap-2">
                {!item.isRead && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleMarkRead(item.id); }}
                    className="text-xs text-th-text2 hover:text-[#58a6ff] transition-colors"
                    title="标记已读"
                  >
                    ✓
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                  className="text-xs text-th-text2 hover:text-[#f85149] transition-colors"
                  title="删除"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="text-sm px-3 py-1.5 rounded-md border border-th-border text-th-text2 hover:text-th-text disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            上一页
          </button>
          <span className="text-sm text-th-text2 font-mono">
            {page} / {data.totalPages}
          </span>
          <button
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="text-sm px-3 py-1.5 rounded-md border border-th-border text-th-text2 hover:text-th-text disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
