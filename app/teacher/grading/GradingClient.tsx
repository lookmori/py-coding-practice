"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import SearchInput from "@/components/SearchInput";
import Pagination from "@/components/Pagination";
import MarkdownEditor from "@/components/MarkdownEditor";

type BankType = "exam" | "practice";

interface AnswerItem {
  id: string;
  type: BankType;
  userAnswer: string;
  questionContent: string;
  questionDescription: string | null;
  correctAnswer: string;
  scoringCriteria: string | null;
  participantName: string;
  username: string | null;
  sessionId: string;
  answeredAt: string;
  comment: string | null;
}

interface PageData {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  items: AnswerItem[];
}

function AnswerCard({ item, onGraded }: { item: AnswerItem; onGraded: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [comment, setComment] = useState(item.comment ?? "");
  const [loading, setLoading] = useState(false);
  const [graded, setGraded] = useState<boolean | null>(null);

  async function grade(isCorrect: boolean) {
    setLoading(true);
    try {
      const res = await fetch(`/api/teacher/grading/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: item.type, isCorrect, comment: comment || null }),
      });
      if (res.ok) {
        setGraded(isCorrect);
        onGraded(item.id);
      }
    } finally {
      setLoading(false);
    }
  }

  if (graded !== null) {
    return (
      <div className={`rounded-xl border-2 p-4 ${graded ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span>{graded ? "✓ 已标记为正确" : "✗ 已标记为错误"}</span>
            <span className="text-gray-400">— {item.participantName}</span>
            {item.username && <span className="text-xs text-gray-400">@{item.username}</span>}
          </div>
          {comment && <span className="text-xs text-gray-500">已添加评语</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-th-border bg-th-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-th-border bg-th-bg2 px-5 py-3">
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${item.type === "exam" ? "bg-[#f78166]/15 text-[#f78166]" : "bg-[#388bfd]/15 text-[#58a6ff]"}`}>
            {item.type === "exam" ? "考试" : "练习"}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="h-7 w-7 rounded-full bg-[#3fb950]/20 flex items-center justify-center text-xs font-bold text-[#3fb950]">
              {item.participantName.charAt(0).toUpperCase()}
            </span>
            <span className="text-sm font-semibold text-th-text">{item.participantName}</span>
            {item.username && <span className="text-xs text-th-muted">@{item.username}</span>}
          </div>
        </div>
        <span className="text-xs text-th-muted">{new Date(item.answeredAt).toLocaleString("zh-CN")}</span>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-th-muted">题目</p>
          <p className="text-sm font-semibold text-th-text">{item.questionContent}</p>
          {item.questionDescription && (
            <p className="mt-1.5 text-xs text-th-text2 whitespace-pre-wrap leading-relaxed bg-th-bg2 rounded-lg px-3 py-2">
              {item.questionDescription}
            </p>
          )}
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-th-muted">学生答案</p>
          <pre className="overflow-x-auto rounded-lg bg-[#0d1117] border border-th-border p-4 text-sm text-[#3fb950] font-mono leading-relaxed">
            {item.userAnswer}
          </pre>
        </div>

        <div>
          <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs font-semibold text-[#58a6ff] hover:text-[#79c0ff]">
            {expanded ? "▼" : "▶"} 参考答案 & 评分标准
          </button>
          {expanded && (
            <div className="mt-2 space-y-2">
              <pre className="overflow-x-auto rounded-lg bg-[#0d1117] border border-th-border p-4 text-sm text-[#79c0ff] font-mono leading-relaxed">
                {item.correctAnswer}
              </pre>
              {item.scoringCriteria && (
                <div className="rounded-lg border border-[#e3b341]/30 bg-[#e3b341]/10 px-4 py-3 text-xs text-[#e3b341] whitespace-pre-wrap">
                  {item.scoringCriteria}
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-th-muted">评语（支持 Markdown）</p>
          <MarkdownEditor
            value={comment}
            onChange={setComment}
            minHeight={100}
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={() => grade(true)} disabled={loading} className="flex-1 rounded-lg bg-[#238636] py-2.5 text-sm font-semibold text-white hover:bg-[#2ea043] disabled:opacity-50 transition-colors">
            {loading ? "提交中..." : "✓ 正确"}
          </button>
          <button onClick={() => grade(false)} disabled={loading} className="flex-1 rounded-lg bg-[#da3633] py-2.5 text-sm font-semibold text-white hover:bg-[#f85149] disabled:opacity-50 transition-colors">
            {loading ? "提交中..." : "✗ 错误"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GradingClient({ initialExamCount, initialPracticeCount }: { initialExamCount: number; initialPracticeCount: number }) {
  const [tab, setTab] = useState<BankType>("practice");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async (t: BankType, p: number, s: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/teacher/grading/list?type=${t}&page=${p}&search=${encodeURIComponent(s)}`);
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(tab, page, search); }, [tab, page, search, fetchData]);

  function handleSearchChange(val: string) {
    setSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearch(val); setPage(1); }, 400);
  }

  function handleTabChange(t: BankType) {
    setTab(t); setPage(1); setSearch(""); setSearchInput("");
  }

  function handleGraded(id: string) {
    setData(prev => {
      if (!prev) return prev;
      const remaining = prev.items.filter(i => i.id !== id);
      const newTotal = prev.total - 1;
      if (remaining.length === 0 && newTotal > 0) {
        const nextPage = page < prev.totalPages ? page : Math.max(1, page - 1);
        setTimeout(() => fetchData(tab, nextPage, search), 0);
        setPage(nextPage);
      }
      return { ...prev, total: newTotal, items: remaining, totalPages: Math.ceil(newTotal / prev.pageSize) };
    });
  }

  const counts = { exam: initialExamCount, practice: initialPracticeCount };
  const visibleItems = data?.items ?? [];

  return (
    <div>
      <div className="mb-5 flex gap-3">
        <span className="rounded-full bg-[#f78166]/15 px-3 py-1 text-sm font-medium text-[#f78166]">待评考试题：{counts.exam}</span>
        <span className="rounded-full bg-[#388bfd]/15 px-3 py-1 text-sm font-medium text-[#58a6ff]">待评练习题：{counts.practice}</span>
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 border-b border-th-border">
          {(["exam", "practice"] as BankType[]).map(t => (
            <button key={t} onClick={() => handleTabChange(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-[#58a6ff] text-[#58a6ff]" : "border-transparent text-th-text2 hover:text-th-text"}`}>
              {t === "exam" ? "考试编程题" : "练习编程题"}
              {data && tab === t && (
                <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${tab === t ? "bg-[#388bfd]/15 text-[#58a6ff]" : "bg-th-hover text-th-muted"}`}>
                  {data.total}
                </span>
              )}
            </button>
          ))}
        </div>
        <SearchInput value={searchInput} onChange={handleSearchChange} placeholder="搜索用户名或题目..." className="w-64" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <svg className="h-8 w-8 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-th-border py-16 text-center">
          <p className="text-3xl mb-2">🎉</p>
          <p className="text-th-text2 text-sm">{search ? "未找到匹配结果" : "暂无待评判的编程题"}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleItems.map(item => (
            <AnswerCard key={item.id} item={item} onGraded={handleGraded} />
          ))}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="mt-6">
          <Pagination page={page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onChange={setPage} />
        </div>
      )}
    </div>
  );
}
