"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import SearchInput from "@/components/SearchInput";
import Pagination from "@/components/Pagination";
import StartExamButton from "./StartExamButton";

interface Bank {
  id: string;
  name: string;
  description: string | null;
  durationSecs: number;
  questionCount: number;
  createdAt: string;
  scheduledAt: string | null;
  endAt: string | null;
}

const PAGE_SIZE = 8;

function formatDuration(secs: number) {
  return `${Math.floor(secs / 60)} 分钟`;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

function getExamStatus(bank: Bank, now: Date) {
  if (bank.endAt && now > new Date(bank.endAt)) {
    return { type: "ended", label: "已结束", color: "bg-th-hover text-th-muted border-th-border" };
  }
  if (bank.scheduledAt && now < new Date(bank.scheduledAt)) {
    return { type: "scheduled", label: "未开始", color: "bg-[#e3b341]/10 text-[#e3b341] border-[#e3b341]/30" };
  }
  return { type: "open", label: "进行中", color: "bg-[#3fb950]/10 text-[#3fb950] border-[#3fb950]/30" };
}

export default function ExamListClient({ banks }: { banks: Bank[] }) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [now, setNow] = useState(() => new Date());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 每分钟刷新一次时间，让状态自动更新
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  function handleSearch(val: string) {
    setSearchInput(val);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { setSearch(val); setPage(1); }, 300);
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return banks;
    const q = search.toLowerCase();
    return banks.filter(b =>
      b.name.toLowerCase().includes(q) ||
      (b.description ?? "").toLowerCase().includes(q)
    );
  }, [banks, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (banks.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-[var(--border)] py-16 text-center">
        <p className="text-4xl mb-3">📋</p>
        <p className="text-[var(--text-secondary)]">暂无可用考试，请联系管理员</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SearchInput value={searchInput} onChange={handleSearch} placeholder="搜索考试名称或描述..." />

      {paged.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] py-10 text-center text-[var(--text-muted)] text-sm">
          未找到匹配的考试
        </div>
      ) : (
        <div className="space-y-4">
          {paged.map((bank) => {
            const status = getExamStatus(bank, now);
            const isDisabled = status.type !== "open";
            return (
              <div key={bank.id}
                className={`group rounded-xl border bg-[var(--bg-secondary)] p-6 transition-all duration-200 ${
                  isDisabled
                    ? "border-[var(--border)] opacity-75"
                    : "border-[var(--border)] hover:border-[#f78166]/50 hover:shadow-[0_0_25px_rgba(247,129,102,0.1)]"
                }`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[#f78166] font-mono text-xs">exam</span>
                      <span className="text-[var(--text-muted)] font-mono text-xs">/</span>
                      <h2 className="text-base font-semibold text-[var(--text-primary)]">
                        {bank.name}
                      </h2>
                      {/* 状态徽章 */}
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    {bank.description && (
                      <p className="text-sm text-[var(--text-secondary)] mb-3">{bank.description}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-xs text-[var(--text-secondary)] font-mono mb-3">
                      <span className="flex items-center gap-1.5">
                        <span className="text-[#f78166]">⏱</span>
                        <span>{formatDuration(bank.durationSecs)}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="text-[#58a6ff]">📄</span>
                        <span>{bank.questionCount} 道题</span>
                      </span>
                      {bank.scheduledAt && (
                        <span className="flex items-center gap-1.5">
                          <span className="text-[#e3b341]">🗓</span>
                          <span>开始：{formatDateTime(bank.scheduledAt)}</span>
                        </span>
                      )}
                      {bank.endAt && (
                        <span className="flex items-center gap-1.5">
                          <span className="text-[#f85149]">⏰</span>
                          <span>截止：{formatDateTime(bank.endAt)}</span>
                        </span>
                      )}
                    </div>
                    {/* 未开始时显示倒计时提示 */}
                    {status.type === "scheduled" && bank.scheduledAt && (
                      <p className="text-xs text-[#e3b341] font-mono">
                        考试将于 {formatDateTime(bank.scheduledAt)} 开放
                      </p>
                    )}
                    {status.type === "ended" && (
                      <p className="text-xs text-th-muted font-mono">考试已结束，不再接受答题</p>
                    )}
                    {status.type === "open" && (
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: "屏幕切换检测", color: "bg-[#f78166]/10 text-[#f78166] border-[#f78166]/20" },
                          { label: "自动交卷", color: "bg-[#58a6ff]/10 text-[#58a6ff] border-[#58a6ff]/20" },
                          { label: "进度自动保存", color: "bg-[#3fb950]/10 text-[#3fb950] border-[#3fb950]/20" },
                        ].map(({ label, color }) => (
                          <span key={label} className={`rounded-full border px-2.5 py-0.5 text-xs font-mono ${color}`}>
                            {label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <StartExamButton bankId={bank.id} disabled={isDisabled} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
    </div>
  );
}
