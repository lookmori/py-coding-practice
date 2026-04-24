"use client";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
  className?: string;
}

export default function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onChange,
  className = "",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  // 生成页码列表（含省略号）
  const pages: (number | "...")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return (
    <div className={`flex items-center justify-between ${className}`}>
      {/* 统计信息 */}
      <p className="text-xs font-mono text-th-muted">
        <span className="text-th-text2">{start}–{end}</span>
        <span className="mx-1 text-[#30363d]">/</span>
        <span className="text-th-text2">{total}</span>
        <span className="ml-1 text-th-muted">条</span>
      </p>

      {/* 页码 */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="flex items-center gap-1 rounded-md border border-th-border bg-th-bg2 px-2.5 py-1.5 text-xs font-mono text-th-text2 transition-all hover:border-[#58a6ff]/50 hover:text-[#58a6ff] disabled:cursor-not-allowed disabled:opacity-30"
        >
          ← prev
        </button>

        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-1.5 text-xs text-th-muted font-mono">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p as number)}
              className={`min-w-[2rem] rounded-md px-2.5 py-1.5 text-xs font-mono transition-all ${
                page === p
                  ? "bg-[#388bfd]/20 border border-[#388bfd]/50 text-[#58a6ff]"
                  : "border border-th-border bg-th-bg2 text-th-text2 hover:border-[#58a6ff]/50 hover:text-[#58a6ff]"
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="flex items-center gap-1 rounded-md border border-th-border bg-th-bg2 px-2.5 py-1.5 text-xs font-mono text-th-text2 transition-all hover:border-[#58a6ff]/50 hover:text-[#58a6ff] disabled:cursor-not-allowed disabled:opacity-30"
        >
          next →
        </button>
      </div>
    </div>
  );
}
