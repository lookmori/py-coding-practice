import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
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
    include: {
      answers: {
        include: {
          question: true,
        },
        orderBy: {
          question: {
            type: "asc",
          },
        },
      },
    },
  });

  if (!examSession) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  if (examSession.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (examSession.submittedAt !== null) {
    return NextResponse.json({ submitted: true, sessionId });
  }

  // Build answers map and ordered questions list (MCQ → TFQ → CODING)
  const typeOrder: Record<string, number> = { MCQ: 0, TFQ: 1, CODING: 2 };
  const sortedAnswers = [...examSession.answers].sort(
    (a, b) =>
      (typeOrder[a.question.type] ?? 99) - (typeOrder[b.question.type] ?? 99)
  );

  const questions = sortedAnswers.map((a) => a.question);
  const answers: Record<string, string | null> = {};
  for (const a of sortedAnswers) {
    answers[a.questionId] = a.userAnswer;
  }

  return NextResponse.json({
    sessionId,
    switchCount: examSession.switchCount,
    durationSecs: examSession.durationSecs,
    startedAt: examSession.startedAt,
    questions,
    answers,
  });
}
