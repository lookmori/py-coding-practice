"use client";

import { useState } from "react";
import { formatDuration } from "@/lib/utils";

type ExamSession = {
  id: string;
  startedAt: string;
  objectiveScore: number | null;
  switchCount: number;
  user: { displayName: string };
};

type PracticeSession = {
  id: string;
  participantName: string;
  startedAt: string;
  correctCount: number | null;
  durationSecs: number | null;
};

export default function RecordsTabs({
  examSessions,
  practiceSessions,
}: {
  examSessions: ExamSession[];
  practiceSessions: PracticeSession[];
}) {
  const [tab, setTab] = useState<"exam" | "practice">("exam");

  return (
    <div>
      <div className="flex gap-2 mb-4 border-b border-th-border">
        <button
          onClick={() => setTab("exam")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "exam"
              ? "border-[#58a6ff] text-[#58a6ff]"
              : "border-transparent text-th-text2 hover:text-th-text"
          }`}
        >
          考试记录 ({examSessions.length})
        </button>
        <button
          onClick={() => setTab("practice")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "practice"
              ? "border-[#58a6ff] text-[#58a6ff]"
              : "border-transparent text-th-text2 hover:text-th-text"
          }`}
        >
          练习记录 ({practiceSessions.length})
        </button>
      </div>

      {tab === "exam" && (
        <div className="overflow-x-auto bg-th-card rounded-lg border border-th-border">
          <table className="min-w-full text-sm">
            <thead className="bg-th-bg2 border-b border-th-border">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-th-text2">用户名</th>
                <th className="px-4 py-3 text-left font-medium text-th-text2">日期</th>
                <th className="px-4 py-3 text-left font-medium text-th-text2">得分</th>
                <th className="px-4 py-3 text-left font-medium text-th-text2">切换次数</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-th-border">
              {examSessions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-th-muted">
                    暂无考试记录
                  </td>
                </tr>
              )}
              {examSessions.map((s) => (
                <tr key={s.id} className="hover:bg-th-hover transition-colors">
                  <td className="px-4 py-3 text-th-text">{s.user.displayName}</td>
                  <td className="px-4 py-3 text-th-text2">
                    {new Date(s.startedAt).toLocaleDateString("zh-CN")}
                  </td>
                  <td className="px-4 py-3 text-th-text">
                    {s.objectiveScore ?? "未提交"}
                  </td>
                  <td className="px-4 py-3 text-th-text2">{s.switchCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "practice" && (
        <div className="overflow-x-auto bg-th-card rounded-lg border border-th-border">
          <table className="min-w-full text-sm">
            <thead className="bg-th-bg2 border-b border-th-border">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-th-text2">用户名</th>
                <th className="px-4 py-3 text-left font-medium text-th-text2">日期</th>
                <th className="px-4 py-3 text-left font-medium text-th-text2">答对数</th>
                <th className="px-4 py-3 text-left font-medium text-th-text2">完成时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-th-border">
              {practiceSessions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-th-muted">
                    暂无练习记录
                  </td>
                </tr>
              )}
              {practiceSessions.map((s) => (
                <tr key={s.id} className="hover:bg-th-hover transition-colors">
                  <td className="px-4 py-3 text-th-text">{s.participantName}</td>
                  <td className="px-4 py-3 text-th-text2">
                    {new Date(s.startedAt).toLocaleDateString("zh-CN")}
                  </td>
                  <td className="px-4 py-3 text-th-text">
                    {s.correctCount ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-th-text2">
                    {s.durationSecs != null ? formatDuration(s.durationSecs) : "未完成"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
