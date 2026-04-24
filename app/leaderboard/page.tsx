import LeaderboardPoller from "./LeaderboardPoller";

interface LeaderboardEntry {
  rank: number;
  sessionId: string;
  participantName: string;
  durationSecs: number | null;
  correctCount: number | null;
}

async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/api/leaderboard`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return data.entries ?? [];
  } catch { return []; }
}

export default async function LeaderboardPage() {
  const entries = await getLeaderboard();
  return (
    <div className="min-h-screen bg-th-bg">
      <div className="fixed inset-0 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(88,166,255,0.04) 1px, transparent 0)", backgroundSize: "40px 40px" }} />
      <div className="relative max-w-3xl mx-auto px-4 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🏆</span>
            <h1 className="text-2xl font-bold text-th-text">排行榜</h1>
          </div>
          <p className="text-sm text-th-text2 font-mono ml-10">
            <span className="text-th-text2"># </span>按完成时间升序排列，每 30 秒刷新
          </p>
        </div>
        <LeaderboardPoller initialEntries={entries} />
      </div>
    </div>
  );
}
