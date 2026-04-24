import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PracticeListClient from "./PracticeListClient";

export default async function PracticePage() {
  const session = await getServerSession();
  if (!session?.user?.id) redirect("/login");

  const [banks, completedSessions] = await Promise.all([
    prisma.questionBank.findMany({
      where: { type: "PRACTICE", isActive: true },
      orderBy: { createdAt: "asc" },
      include: {
        questions: {
          where: { question: { type: "CODING" } },
          select: { id: true },
        },
      },
    }),
    prisma.practiceSession.findMany({
      where: { userId: session.user.id, completedAt: { not: null } },
      orderBy: { completedAt: "desc" },
    }),
  ]);

  const latestByBank = new Map<string, typeof completedSessions[0]>();
  for (const s of completedSessions) {
    if (s.bankId && !latestByBank.has(s.bankId)) latestByBank.set(s.bankId, s);
  }

  const banksData = banks.map(b => {
    const done = latestByBank.get(b.id);
    return {
      id: b.id,
      name: b.name,
      description: b.description,
      questionCount: b.questions.length,
      createdAt: b.createdAt.toISOString(),
      doneSessionId: done?.id,
      doneCorrectCount: done?.correctCount ?? undefined,
      doneDurationSecs: done?.durationSecs ?? undefined,
    };
  });

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="fixed inset-0 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(88,166,255,0.04) 1px, transparent 0)", backgroundSize: "40px 40px" }} />
      <div className="relative mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🚀</span>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">练习模式</h1>
          </div>
          <p className="text-sm text-[var(--text-secondary)] font-mono ml-10">
            <span className="text-[var(--text-muted)]"># </span>
            欢迎，<span className="text-[#58a6ff]">{session.user.displayName}</span>。选择一个练习组开始答题。
          </p>
        </div>
        <PracticeListClient banks={banksData} />
      </div>
    </div>
  );
}
