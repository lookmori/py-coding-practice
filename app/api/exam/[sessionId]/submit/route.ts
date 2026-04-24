import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { QuestionType } from "@prisma/client";

export async function POST(
  _req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = params;
  const examSession = await prisma.examSession.findUnique({
    where: { id: sessionId },
  });

  if (!examSession || examSession.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (examSession.submittedAt !== null) {
    return NextResponse.json({ error: "已提交", sessionId }, { status: 409 });
  }

  const answers = await prisma.examAnswer.findMany({
    where: { sessionId },
    include: { question: true },
  });

  const objectiveTypes: QuestionType[] = [QuestionType.MCQ, QuestionType.TFQ];

  const updatedAnswers = answers.map((a) => {
    const isObjective = objectiveTypes.includes(a.question.type);
    const isCorrect = isObjective
      ? a.userAnswer === a.question.correctAnswer
      : null;
    return { id: a.id, isCorrect };
  });

  const objectiveScore = updatedAnswers.filter((a) => a.isCorrect === true).length;

  await prisma.$transaction([
    ...updatedAnswers.map((a) =>
      prisma.examAnswer.update({
        where: { id: a.id },
        data: { isCorrect: a.isCorrect },
      })
    ),
    prisma.examSession.update({
      where: { id: sessionId },
      data: { submittedAt: new Date(), objectiveScore },
    }),
  ]);

  return NextResponse.json({ sessionId, objectiveScore });
}
