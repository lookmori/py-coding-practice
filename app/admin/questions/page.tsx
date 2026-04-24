import { prisma } from "@/lib/prisma";
import BankManagerClient from "./BankManagerClient";

async function getData() {
  const [banks, questions] = await Promise.all([
    prisma.questionBank.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { questions: true } },
      },
    }),
    prisma.question.findMany({
      select: { id: true, type: true, category: true, content: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return { banks, questions };
}

export default async function AdminQuestionsPage() {
  const { banks, questions } = await getData();

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-1">题库管理</h1>
      <p className="text-sm text-gray-500 mb-6">管理考试和练习的题库组，导入题目并分配到各组。</p>
      <BankManagerClient
        banks={banks.map(b => ({
          id: b.id,
          name: b.name,
          type: b.type,
          description: b.description,
          durationSecs: b.durationSecs,
          isActive: b.isActive,
          createdAt: b.createdAt.toISOString(),
          questionCount: b._count.questions,
        }))}
        questions={questions}
      />
    </div>
  );
}
