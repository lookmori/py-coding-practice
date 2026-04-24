import { redirect, notFound } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ScoreSummary from "@/components/ScoreSummary";

interface Props {
  params: { sessionId: string };
}

export default async function ExamResultPage({ params }: Props) {
  const authSession = await getServerSession();
  if (!authSession?.user?.id) {
    redirect("/login");
  }

  const examSession = await prisma.examSession.findUnique({
    where: { id: params.sessionId },
    include: {
      answers: {
        include: {
          question: {
            select: {
              content: true,
              type: true,
              correctAnswer: true,
              optionA: true,
              optionB: true,
              optionC: true,
              optionD: true,
            },
          },
        },
      },
    },
  });

  if (!examSession) notFound();
  if (examSession.userId !== authSession.user.id) redirect("/403");

  const objectiveAnswers = examSession.answers.filter(
    (a) => a.question.type === "MCQ" || a.question.type === "TFQ"
  );

  const totalObjective = objectiveAnswers.length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold text-th-text">考试结果</h1>
      <ScoreSummary
        objectiveScore={examSession.objectiveScore ?? 0}
        totalObjective={totalObjective}
        switchCount={examSession.switchCount}
        answers={objectiveAnswers}
      />
      <div className="mt-6">
        <a
          href="/exam"
          className="inline-block rounded-md bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          返回考试首页
        </a>
      </div>
    </div>
  );
}
