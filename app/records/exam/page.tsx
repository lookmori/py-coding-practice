import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDuration } from "@/lib/utils";
import ExamRecordsClient from "./ExamRecordsClient";

export default async function ExamRecordsPage() {
  const session = await getServerSession();
  if (!session?.user?.id) redirect("/login");

  const examSessions = await prisma.examSession.findMany({
    where: { userId: session.user.id },
    orderBy: { startedAt: "desc" },
    include: {
      answers: { select: { question: { select: { type: true } } } },
      bank: { select: { name: true } },
    },
  });

  const data = examSessions.map(s => ({
    id: s.id,
    bankName: s.bank?.name ?? "考试",
    startedAt: s.startedAt.toISOString(),
    submittedAt: s.submittedAt?.toISOString() ?? null,
    objectiveScore: s.objectiveScore,
    switchCount: s.switchCount,
    durationSecs: s.submittedAt
      ? Math.round((s.submittedAt.getTime() - s.startedAt.getTime()) / 1000)
      : s.durationSecs,
    totalObjective: s.answers.filter(a => a.question.type === "MCQ" || a.question.type === "TFQ").length,
    totalQuestions: s.answers.length,
  }));

  return (
    <div className="min-h-screen bg-th-bg">
      <div className="relative mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/records" className="text-xs font-mono text-th-text2 hover:text-[#58a6ff] transition-colors">← records</Link>
          <span className="text-[#30363d]">/</span>
          <h1 className="text-xl font-bold text-th-text">历史考试记录</h1>
        </div>
        <ExamRecordsClient sessions={data} />
      </div>
    </div>
  );
}
