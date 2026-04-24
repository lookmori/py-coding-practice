import CompletionPoller from "./CompletionPoller";

interface CompletionItem {
  questionId: string;
  contentPreview: string;
  completionRate: number;
  answeredCount: number;
  totalSessions: number;
}

async function getCompletion(): Promise<CompletionItem[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/api/completion`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return data.items ?? [];
  } catch { return []; }
}

export default async function CompletionPage() {
  const items = await getCompletion();
  return (
    <div className="min-h-screen bg-th-bg">
      <div className="fixed inset-0 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(88,166,255,0.04) 1px, transparent 0)", backgroundSize: "40px 40px" }} />
      <div className="relative max-w-4xl mx-auto px-4 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">📈</span>
            <h1 className="text-2xl font-bold text-th-text">题目完成度统计</h1>
          </div>
          <p className="text-sm text-th-text2 font-mono ml-10">
            <span className="text-th-text2"># </span>每 30 秒自动刷新
          </p>
        </div>
        <CompletionPoller initialItems={items} />
      </div>
    </div>
  );
}
