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

  const practiceSession = await prisma.practiceSession.findUnique({
    where: { id: sessionId },
    include: {
      answers: {
        include: { question: true },
      },
    },
  });

  if (!practiceSession) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (practiceSession.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // If already completed, return full data in readonly mode
  if (practiceSession.completedAt !== null) {
    // 获取该 session 对应的题库题目（按顺序）
    const bankItems = practiceSession.bankId
      ? await prisma.questionBankItem.findMany({
          where: { bankId: practiceSession.bankId },
          orderBy: { order: "asc" },
          include: { question: true },
        })
      : [];

    const questions = bankItems.length > 0
      ? bankItems.map(i => i.question)
      : practiceSession.answers.map(a => a.question);

    const answersMap: Record<string, string> = {};
    const skippedIds: string[] = [];
    const correctMap: Record<string, boolean | null> = {};
    const commentMap: Record<string, string> = {};

    for (const answer of practiceSession.answers) {
      if (answer.userAnswer !== null) answersMap[answer.questionId] = answer.userAnswer;
      if (answer.isSkipped) skippedIds.push(answer.questionId);
      correctMap[answer.questionId] = answer.isCorrect;
      if (answer.comment) commentMap[answer.questionId] = answer.comment;
    }

    return NextResponse.json({
      sessionId,
      completed: true,
      readonly: true,
      questions,
      answers: answersMap,
      skippedIds,
      correctMap,
      commentMap,
      durationSecs: practiceSession.durationSecs,
      correctCount: practiceSession.correctCount,
      completedAt: practiceSession.completedAt,
      bankId: practiceSession.bankId,
    });
  }

  // Get questions from the bank this session belongs to
  let questions;
  if (practiceSession.bankId) {
    const bankItems = await prisma.questionBankItem.findMany({
      where: { bankId: practiceSession.bankId },
      orderBy: { order: "asc" },
      include: { question: true },
    });
    questions = bankItems.map(i => i.question);
  } else {
    // fallback: use all practice questions
    const { getAllPracticeQuestions } = await import("@/lib/questions");
    questions = await getAllPracticeQuestions();
  }

  // Build answers map: questionId -> userAnswer
  const answersMap: Record<string, string> = {};
  for (const answer of practiceSession.answers) {
    if (answer.userAnswer !== null) {
      answersMap[answer.questionId] = answer.userAnswer;
    }
  }

  // Build skipped set
  const skippedIds: string[] = practiceSession.answers
    .filter((a) => a.isSkipped)
    .map((a) => a.questionId);

  return NextResponse.json({
    sessionId,
    questions,
    answers: answersMap,
    skippedIds,
    bankId: practiceSession.bankId,
  });
}
