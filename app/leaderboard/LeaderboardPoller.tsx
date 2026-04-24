"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { formatDuration } from "@/lib/utils";
import SearchInput from "@/components/SearchInput";
import Pagination from "@/components/Pagination";

interface LeaderboardEntry {
  rank: number;
  sessionId: string;
  participantName: string;
  durationSecs: number | null;
  correctCount: number | null;
}

const PAGE_SIZE = 20;
const rankEmoji = ["🥇", "🥈", "🥉"];

export default function LeaderboardPoller({ initialEntries }: { initialEntries: LeaderboardEntry[] }) {
  const [entries, setEntries] = useState(initialEntries);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/leaderboard");
        if (res.ok) { const data = await res.json(); setEntries(data.entries ?? []); }
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
    if (!search.trim()) return entries;
    return entries.filter(e => e.participantName.toLowerCase().includes(search.toLowerCase()));
  }, [entries, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-th-border py-16 text-center">
        <p className="text-3xl mb-3">🎯</p>
        <p className="text-th-text2 text-sm">暂无记录，完成练习后将上榜</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SearchInput value={searchInput} onChange={handleSearch} placeholder="搜索参与者姓名..." />

      <div className="rounded-xl border border-th-border bg-th-bg2 overflow-hidden">
        <div className="grid grid-cols-[4rem_1fr_8rem_6rem] gap-4 border-b border-th-border bg-th-card px-5 py-3">
          {["排名", "参与者", "完成时间", "答对题数"].map(h => (
            <span key={h} className="text-xs font-mono font-semibold text-th-text2 uppercase tracking-wide">{h}</span>
          ))}
        </div>
        <div className="divide-y divide-th-border">
          {paged.length === 0 ? (
            <div className="px-5 py-10 text-center text-th-muted text-sm">未找到匹配结果</div>
          ) : paged.map((entry) => (
            <div key={entry.sessionId}
              className="grid grid-cols-[4rem_1fr_8rem_6rem] gap-4 items-center px-5 py-3.5 hover:bg-th-hover transition-colors">
              <div className="flex items-center">
                {entry.rank <= 3
                  ? <span className="text-lg">{rankEmoji[entry.rank - 1]}</span>
                  : <span className="text-sm font-mono font-bold text-th-muted">#{entry.rank}</span>}
              </div>
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-[#58a6ff] to-[#3fb950] flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {entry.participantName.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm text-th-text truncate">{entry.participantName}</span>
              </div>
              <span className={`text-sm font-mono font-semibold ${entry.rank === 1 ? "text-[#e3b341]" : "text-th-text2"}`}>
                {entry.durationSecs != null ? formatDuration(entry.durationSecs) : "—"}
              </span>
              <span className="text-sm font-mono text-[#3fb950]">{entry.correctCount ?? 0}</span>
            </div>
          ))}
        </div>
      </div>

      <Pagination page={page} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
    </div>
  );
}
