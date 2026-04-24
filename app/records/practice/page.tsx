import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PracticeRecordsClient from "./PracticeRecordsClient";

export default async function PracticeRecordsPage() {
  const session = await getServerSession();
  if (!session?.user?.id) redirect("/login");

  const practiceSessions = await prisma.practiceSession.findMany({
    where: { userId: session.user.id },
    orderBy: { startedAt: "desc" },
    include: {
      bank: { select: { name: true } },
      answers: { select: { isCorrect: true, isSkipped: true } },
    },
  });

  const data = practiceSessions.map(s => ({
    id: s.id,
    bankName: s.bank?.name ?? "练习",
    startedAt: s.startedAt.toISOString(),
    completedAt: s.completedAt?.toISOString() ?? null,
    durationSecs: s.durationSecs ?? 0,
    correctCount: s.correctCount ?? s.answers.filter(a => a.isCorrect).length,
    skippedCount: s.answers.filter(a => a.isSkipped).length,
    totalCount: s.answers.length,
  }));

  return (
    <div className="min-h-screen bg-th-bg">
      <div className="relative mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/records" className="text-xs font-mono text-th-text2 hover:text-[#58a6ff] transition-colors">← records</Link>
          <span className="text-[#30363d]">/</span>
          <h1 className="text-xl font-bold text-th-text">历史练习记录</h1>
        </div>
        <PracticeRecordsClient sessions={data} />
      </div>
    </div>
  );
}
