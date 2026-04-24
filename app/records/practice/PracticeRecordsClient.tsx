"use client";

import { useState, useMemo, useRef } from "react";
import Link from "next/link";
import SearchInput from "@/components/SearchInput";
import Pagination from "@/components/Pagination";
import { formatDuration } from "@/lib/utils";

interface PracticeRecord {
  id: string;
  bankName: string;
  startedAt: string;
  completedAt: string | null;
  durationSecs: number;
  correctCount: number;
  skippedCount: number;
  totalCount: number;
}

const PAGE_SIZE = 10;

export default function PracticeRecordsClient({ sessions }: { sessions: PracticeRecord[] }) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearch(val: string) {
    setSearchInput(val);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { setSearch(val); setPage(1); }, 300);
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return sessions;
    const q = search.toLowerCase();
    return sessions.filter(s =>
      s.bankName.toLowerCase().includes(q) ||
      new Date(s.startedAt).toLocaleDateString("zh-CN").includes(q)
    );
  }, [sessions, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (sessions.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-th-border py-16 text-center">
        <p className="text-th-muted text-sm mb-2">暂无练习记录</p>
        <Link href="/practice" className="text-xs font-mono text-[#58a6ff] hover:underline">去练习 →</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SearchInput value={searchInput} onChange={handleSearch} placeholder="搜索练习名称或日期..." />

      {paged.length === 0 ? (
        <div className="rounded-xl border border-th-border py-10 text-center text-th-muted text-sm">
          未找到匹配记录
        </div>
      ) : (
        <div className="rounded-xl border border-th-border bg-th-bg2 overflow-hidden">
          {paged.map((s, i) => (
            <Link key={s.id} href={`/practice/${s.id}`}
              className={`flex items-center justify-between px-5 py-4 hover:bg-th-hover transition-colors ${i > 0 ? "border-t border-th-border" : ""}`}>
              <div>
                <p className="text-sm font-semibold text-th-text">{s.bankName}</p>
                <p className="text-xs text-th-text2 mt-0.5 font-mono">
                  {new Date(s.startedAt).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" })}
                  <span className="mx-1.5 text-[#30363d]">·</span>
                  答对 <span className="text-[#3fb950]">{s.correctCount}</span>/{s.totalCount}
                  <span className="mx-1.5 text-[#30363d]">·</span>
                  跳过 <span className="text-[#e3b341]">{s.skippedCount}</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono text-th-text2">{formatDuration(s.durationSecs)}</span>
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-mono ${
                  s.completedAt ? "bg-[#58a6ff]/10 text-[#58a6ff] border-[#58a6ff]/20" : "bg-[#e3b341]/10 text-[#e3b341] border-[#e3b341]/20"
                }`}>
                  {s.completedAt ? "已完成" : "进行中"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
    </div>
  );
}
