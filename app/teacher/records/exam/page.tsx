import { headers } from "next/headers";

interface ExamSession {
  id: string;
  startedAt: string;
  submittedAt: string | null;
  objectiveScore: number | null;
  switchCount: number;
  durationSecs: number;
  user: { id: string; username: string; displayName: string };
  bank: { id: string; name: string };
}

async function getExamRecords(): Promise<ExamSession[]> {
  const host = headers().get("host") ?? "localhost:3000";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const res = await fetch(`${protocol}://${host}/api/teacher/records/exam`, {
    cache: "no-store",
    headers: { cookie: headers().get("cookie") ?? "" },
  });
  if (!res.ok) return [];
  return res.json();
}

export default async function TeacherExamRecordsPage() {
  const records = await getExamRecords();

  return (
    <div>
      <h1 className="text-xl font-bold text-th-text mb-1">考试记录</h1>
      <p className="text-sm text-th-text2 mb-6">本校学生的考试记录。</p>

      <div className="overflow-x-auto rounded-xl border border-th-border bg-th-card">
        <table className="w-full text-sm">
          <thead className="bg-th-bg2 border-b border-th-border">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-th-text2">学生</th>
              <th className="px-4 py-3 text-left font-medium text-th-text2">题库</th>
              <th className="px-4 py-3 text-left font-medium text-th-text2">考试日期</th>
              <th className="px-4 py-3 text-left font-medium text-th-text2">得分</th>
              <th className="px-4 py-3 text-left font-medium text-th-text2">切换次数</th>
              <th className="px-4 py-3 text-left font-medium text-th-text2">状态</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-th-border">
            {records.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-th-muted">暂无考试记录</td>
              </tr>
            ) : records.map(r => (
              <tr key={r.id} className="hover:bg-th-hover transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-th-text">{r.user.displayName}</div>
                  <div className="text-xs text-th-muted font-mono">{r.user.username}</div>
                </td>
                <td className="px-4 py-3 text-th-text2">{r.bank.name}</td>
                <td className="px-4 py-3 text-th-muted text-xs">{new Date(r.startedAt).toLocaleString("zh-CN")}</td>
                <td className="px-4 py-3">
                  {r.objectiveScore !== null ? (
                    <span className="font-semibold text-th-text">{r.objectiveScore}</span>
                  ) : (
                    <span className="text-th-muted text-xs">未评分</span>
                  )}
                </td>
                <td className="px-4 py-3 text-th-text2">{r.switchCount}</td>
                <td className="px-4 py-3">
                  {r.submittedAt ? (
                    <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-[#3fb950]/15 text-[#3fb950]">已提交</span>
                  ) : (
                    <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-[#e3b341]/15 text-[#e3b341]">进行中</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {records.length > 0 && (
          <div className="border-t border-th-border px-4 py-2.5 text-xs text-th-muted">共 {records.length} 条记录</div>
        )}
      </div>
    </div>
  );
}
