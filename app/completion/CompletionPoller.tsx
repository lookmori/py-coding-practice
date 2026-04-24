"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import SearchInput from "@/components/SearchInput";
import Pagination from "@/components/Pagination";

interface CompletionItem {
  questionId: string;
  contentPreview: string;
  completionRate: number;
  answeredCount: number;
  totalSessions: number;
}

const PAGE_SIZE = 20;

export default function CompletionPoller({ initialItems }: { initialItems: CompletionItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/completion");
        if (res.ok) { const data = await res.json(); setItems(data.items ?? []); }
      } catch { /* silent */ }
    }, 30000);
    return () => clearInterval(id);
  }, []);

  function handleSearch(val: string) {
    setSearchInput(val);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { setSearch(val); setPage(1); }, 300);
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    return items.filter(i => i.contentPreview.toLowerCase().includes(search.toLowerCase()));
  }, [items, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (items.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-th-border py-16 text-center">
        <p className="text-3xl mb-3">📊</p>
        <p className="text-th-text2 text-sm">暂无数据，完成练习后将显示统计</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SearchInput value={searchInput} onChange={handleSearch} placeholder="搜索题目内容..." />

      <div className="rounded-xl border border-th-border bg-th-bg2 overflow-hidden">
        <div className="grid grid-cols-[3rem_1fr_12rem_6rem] gap-4 border-b border-th-border bg-th-card px-5 py-3">
          {["序号", "题干摘要", "完成度", "作答人数"].map(h => (
            <span key={h} className="text-xs font-mono font-semibold text-th-text2 uppercase tracking-wide">{h}</span>
          ))}
        </div>
        <div className="divide-y divide-th-border">
          {paged.length === 0 ? (
            <div className="px-5 py-10 text-center text-th-muted text-sm">未找到匹配题目</div>
          ) : paged.map((item, index) => {
            const rate = item.completionRate;
            const color = rate >= 70 ? "#3fb950" : rate >= 40 ? "#e3b341" : "#f78166";
            const globalIndex = (page - 1) * PAGE_SIZE + index + 1;
            return (
              <div key={item.questionId}
                className="grid grid-cols-[3rem_1fr_12rem_6rem] gap-4 items-center px-5 py-3.5 hover:bg-th-hover transition-colors">
                <span className="text-xs font-mono text-th-muted">{String(globalIndex).padStart(2, "0")}</span>
                <span className="text-sm text-th-text truncate">{item.contentPreview}</span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-th-hover overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${rate}%`, backgroundColor: color }} />
                  </div>
                  <span className="text-xs font-mono w-10 text-right" style={{ color }}>
                    {rate.toFixed(1)}%
                  </span>
                </div>
                <span className="text-sm font-mono text-th-text2">{item.answeredCount}</span>
              </div>
            );
          })}
        </div>
      </div>

      <Pagination page={page} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
    </div>
  );
}
