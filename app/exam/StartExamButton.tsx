"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LoadingButton from "@/components/LoadingButton";

export default function StartExamButton({ bankId, disabled }: { bankId: string; disabled?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    if (disabled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/exam/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankId }),
      });
      if (res.status === 422) { setError("题库题目不足，无法开始考试"); return; }
      if (res.status === 403) {
        const data = await res.json();
        setError(data.error ?? "考试暂不可用");
        return;
      }
      if (!res.ok) { setError("开始考试失败，请稍后重试"); return; }
      const data = await res.json();
      router.push(`/exam/${data.sessionId}`);
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="shrink-0 text-right">
      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
      <LoadingButton
        onClick={handleStart}
        loading={loading}
        loadingText="准备中..."
        disabled={disabled}
        className={`border-0 px-5 py-2.5 whitespace-nowrap font-mono text-sm ${
          disabled
            ? "bg-th-hover text-th-muted cursor-not-allowed"
            : "bg-[#238636] hover:bg-[#2ea043]"
        }`}
      >
        {disabled ? "暂不可用" : "开始考试 →"}
      </LoadingButton>
    </div>
  );
}
