import { headers } from "next/headers";

interface PracticeSession {
  id: string;
  participantName: string;
  startedAt: string;
  completedAt: string | null;
  correctCount: number;
  durationSecs: number | null;
  user: { id: string; username: string; displayName: string };
  bank: { id: string; name: string };
}

async function getPracticeRecords(): Promise<PracticeSession[]> {
  const host = headers().get("host") ?? "localhost:3000";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const res = await fetch(`${protocol}://${host}/api/teacher/records/practice`, {
    cache: "no-store",
    headers: { cookie: headers().get("cookie") ?? "" },
  });
  if (!res.ok) return [];
  return res.json();
}

export default async function TeacherPracticeRecordsPage() {
  const records = await getPracticeRecords();

  return (
    <div>
      <h1 className="text-xl font-bold text-th-text mb-1">练习记录</h1>
      <p className="text-sm text-th-text2 mb-6">本校学生的练习记录。</p>

      <div className="overflow-x-auto rounded-xl border border-th-border bg-th-card">
        <table className="w-full text-sm">
          <thead className="bg-th-bg2 border-b border-th-border">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-th-text2">学生</th>
              <th className="px-4 py-3 text-left font-medium text-th-text2">题库</th>
              <th className="px-4 py-3 text-left font-medium text-th-text2">练习日期</th>
              <th className="px-4 py-3 text-left font-medium text-th-text2">答对数</th>
              <th className="px-4 py-3 text-left font-medium text-th-text2">完成时间</th>
              <th className="px-4 py-3 text-left font-medium text-th-text2">状态</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-th-border">
            {records.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-th-muted">暂无练习记录</td>
              </tr>
            ) : records.map(r => (
              <tr key={r.id} className="hover:bg-th-hover transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-th-text">{r.user.displayName}</div>
                  <div className="text-xs text-th-muted font-mono">{r.user.username}</div>
                </td>
                <td className="px-4 py-3 text-th-text2">{r.bank.name}</td>
                <td className="px-4 py-3 text-th-muted text-xs">{new Date(r.startedAt).toLocaleString("zh-CN")}</td>
                <td className="px-4 py-3 font-semibold text-th-text">{r.correctCount}</td>
                <td className="px-4 py-3 text-th-text2 text-xs">
                  {r.durationSecs != null ? `${Math.floor(r.durationSecs / 60)} 分 ${r.durationSecs % 60} 秒` : "—"}
                </td>
                <td className="px-4 py-3">
                  {r.completedAt ? (
                    <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-[#3fb950]/15 text-[#3fb950]">已完成</span>
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
