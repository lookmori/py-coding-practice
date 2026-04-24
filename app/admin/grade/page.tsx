import GradeClient from "./GradeClient";
import { prisma } from "@/lib/prisma";

async function getCounts() {
  const [examCount, practiceCount] = await Promise.all([
    prisma.examAnswer.count({ where: { isCorrect: null, question: { type: "CODING" }, userAnswer: { not: null } } }),
    prisma.practiceAnswer.count({ where: { isCorrect: null, isSkipped: false, question: { type: "CODING" }, userAnswer: { not: null } } }),
  ]);
  return { examCount, practiceCount };
}

export default async function AdminGradePage() {
  const { examCount, practiceCount } = await getCounts();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-th-text">编程题评分</h1>
        <p className="mt-1 text-sm text-th-text2">手动评判编程大题，支持添加 Markdown 格式评语，评分后自动更新总分。</p>
      </div>
      <GradeClient initialExamCount={examCount} initialPracticeCount={practiceCount} />
    </div>
  );
}
