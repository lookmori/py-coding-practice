"use client";

import { formatDuration } from "@/lib/utils";

interface LeaderboardEntry {
  rank: number;
  sessionId: string;
  participantName: string;
  durationSecs: number | null;
  correctCount: number | null;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  highlightSessionId?: string;
}

export default function Leaderboard({ entries, highlightSessionId }: LeaderboardProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-th-border">
      <table className="w-full text-sm">
        <thead className="bg-th-bg text-th-text2">
          <tr>
            <th className="px-4 py-3 text-left font-medium">排名</th>
            <th className="px-4 py-3 text-left font-medium">姓名</th>
            <th className="px-4 py-3 text-left font-medium">完成时间</th>
            <th className="px-4 py-3 text-left font-medium">答对题数</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {entries.map((entry) => {
            const isHighlighted = entry.sessionId === highlightSessionId;
            return (
              <tr
                key={entry.sessionId}
                className={isHighlighted ? "bg-yellow-100" : "bg-th-bg2 hover:bg-th-bg"}
              >
                <td className="px-4 py-3 font-medium text-th-text">{entry.rank}</td>
                <td className="px-4 py-3 text-th-text">{entry.participantName}</td>
                <td className="px-4 py-3 font-mono text-th-text">
                  {entry.durationSecs != null ? formatDuration(entry.durationSecs) : "—"}
                </td>
                <td className="px-4 py-3 text-th-text">
                  {entry.correctCount != null ? entry.correctCount : "—"}
                </td>
              </tr>
            );
          })}
          {entries.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-th-muted">
                暂无数据
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
