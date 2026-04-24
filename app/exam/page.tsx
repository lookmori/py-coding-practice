import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExamListClient from "./ExamListClient";

export default async function ExamPage() {
  const session = await getServerSession();
  if (!session?.user?.id) redirect("/login");

  const banks = await prisma.questionBank.findMany({
    where: { type: "EXAM", isActive: true },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { questions: true } } },
  });

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="fixed inset-0 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(88,166,255,0.04) 1px, transparent 0)", backgroundSize: "40px 40px" }} />
      <div className="relative mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">⏱</span>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">考试模式</h1>
          </div>
          <p className="text-sm text-[var(--text-secondary)] font-mono ml-10">
            <span className="text-[var(--text-muted)]"># </span>
            选择一套考试开始答题，系统将自动计时并检测屏幕切换行为。
          </p>
        </div>
        <ExamListClient banks={banks.map(b => ({
          id: b.id,
          name: b.name,
          description: b.description,
          durationSecs: b.durationSecs,
          questionCount: b._count.questions,
          createdAt: b.createdAt.toISOString(),
          scheduledAt: b.scheduledAt?.toISOString() ?? null,
          endAt: b.endAt?.toISOString() ?? null,
        }))} />
      </div>
    </div>
  );
}
