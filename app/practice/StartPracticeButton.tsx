"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LoadingButton from "@/components/LoadingButton";

export default function StartPracticeButton({ bankId }: { bankId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/practice/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankId }),
      });
      if (!res.ok) { setError("开始练习失败，请稍后重试"); return; }
      const data = await res.json();
      router.push(`/practice/${data.sessionId}`);
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
        className="px-5 py-2.5 whitespace-nowrap font-mono text-sm bg-[#238636] hover:bg-[#2ea043] border-0"
      >
        开始练习 →
      </LoadingButton>
    </div>
  );
}
