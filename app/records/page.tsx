import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDuration } from "@/lib/utils";

export default async function RecordsPage() {
  const session = await getServerSession();
  if (!session?.user?.id) redirect("/login");

  // 串行查询，避免连接池超时
  const examSessions = await prisma.examSession.findMany({
    where: { userId: session.user.id },
    orderBy: { startedAt: "desc" },
    take: 5,
    select: {
      id: true,
      startedAt: true,
      submittedAt: true,
      objectiveScore: true,
      switchCount: true,
      durationSecs: true,
      answers: { select: { question: { select: { type: true } } } },
    },
  });

  const practiceSessions = await prisma.practiceSession.findMany({
    where: { userId: session.user.id, completedAt: { not: null } },
    orderBy: { startedAt: "desc" },
    take: 5,
    select: {
      id: true,
      startedAt: true,
      durationSecs: true,
      correctCount: true,
      bank: { select: { name: true } },
      answers: { select: { isSkipped: true } },
    },
  });

  return (
    <div className="min-h-screen bg-th-bg">
      {/* 背景网格（不用 fixed，避免 z-index 问题） */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(88,166,255,0.04) 1px, transparent 0)", backgroundSize: "40px 40px" }} />

      <div className="relative mx-auto max-w-3xl px-4 py-10">
        {/* 标题 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">📋</span>
            <h1 className="text-2xl font-bold text-th-text">个人记录</h1>
          </div>
          <p className="text-sm text-th-text2 font-mono ml-10">
            <span className="text-th-muted"># </span>
            欢迎，<span className="text-[#58a6ff]">{session.user.displayName}</span>
          </p>
        </div>

        <div className="space-y-8">
          {/* 考试记录 */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-mono flex items-center gap-2">
                <span className="text-[#f78166]">⏱</span>
                <span className="text-th-text font-semibold">考试记录</span>
              </h2>
              <Link href="/records/exam" className="text-xs font-mono text-[#58a6ff] hover:text-[#79c0ff] transition-colors">
                查看全部 →
              </Link>
            </div>

            {examSessions.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-th-border py-8 text-center">
                <p className="text-th-muted text-sm mb-2">暂无考试记录</p>
                <Link href="/exam" className="text-xs font-mono text-[#58a6ff] hover:underline">去参加考试 →</Link>
              </div>
            ) : (
              <div className="rounded-xl border border-th-border bg-th-bg2 overflow-hidden">
                {examSessions.map((s, i) => {
                  const totalObjective = s.answers.filter(a => a.question.type === "MCQ" || a.question.type === "TFQ").length;
                  const duration = s.submittedAt
                    ? Math.round((s.submittedAt.getTime() - s.startedAt.getTime()) / 1000)
                    : s.durationSecs;
                  return (
                    <Link key={s.id} href={`/records/exam/${s.id}`}
                      className={`flex items-center justify-between px-5 py-4 hover:bg-th-hover transition-colors ${i > 0 ? "border-t border-th-border" : ""}`}>
                      <div>
                        <p className="text-sm font-semibold text-th-text">
                          {s.startedAt.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" })}
                        </p>
                        <p className="text-xs text-th-text2 mt-0.5 font-mono">
                          客观题 <span className="text-th-text">{s.objectiveScore ?? "—"}</span>/{totalObjective}
                          <span className="mx-1.5 text-th-muted">·</span>
                          切换 <span className="text-[#f78166]">{s.switchCount}</span> 次
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono text-th-text2">{formatDuration(duration)}</span>
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-mono ${
                          s.submittedAt
                            ? "bg-[#3fb950]/10 text-[#3fb950] border-[#3fb950]/20"
                            : "bg-[#e3b341]/10 text-[#e3b341] border-[#e3b341]/20"
                        }`}>
                          {s.submittedAt ? "已完成" : "未提交"}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* 练习记录 */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-mono flex items-center gap-2">
                <span className="text-[#3fb950]">🚀</span>
                <span className="text-th-text font-semibold">练习记录</span>
              </h2>
              <Link href="/records/practice" className="text-xs font-mono text-[#58a6ff] hover:text-[#79c0ff] transition-colors">
                查看全部 →
              </Link>
            </div>

            {practiceSessions.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-th-border py-8 text-center">
                <p className="text-th-muted text-sm mb-2">暂无练习记录</p>
                <Link href="/practice" className="text-xs font-mono text-[#58a6ff] hover:underline">去练习 →</Link>
              </div>
            ) : (
              <div className="rounded-xl border border-th-border bg-th-bg2 overflow-hidden">
                {practiceSessions.map((s, i) => {
                  const skippedCount = s.answers.filter(a => a.isSkipped).length;
                  return (
                    <Link key={s.id} href={`/practice/${s.id}`}
                      className={`flex items-center justify-between px-5 py-4 hover:bg-th-hover transition-colors ${i > 0 ? "border-t border-th-border" : ""}`}>
                      <div>
                        <p className="text-sm font-semibold text-th-text">{s.bank?.name ?? "练习"}</p>
                        <p className="text-xs text-th-text2 mt-0.5 font-mono">
                          {s.startedAt.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" })}
                          <span className="mx-1.5 text-th-muted">·</span>
                          答对 <span className="text-[#3fb950]">{s.correctCount ?? 0}</span> 题
                          <span className="mx-1.5 text-th-muted">·</span>
                          跳过 <span className="text-[#e3b341]">{skippedCount}</span> 题
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono text-th-text2">{formatDuration(s.durationSecs ?? 0)}</span>
                        <span className="rounded-full border bg-[#58a6ff]/10 text-[#58a6ff] border-[#58a6ff]/20 px-2.5 py-0.5 text-xs font-mono">
                          已完成
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
