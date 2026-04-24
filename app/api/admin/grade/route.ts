import { NextRequest, NextResponse } from "next/server";
import { getServerSession, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAndPushNotification } from "@/lib/notificationService";

// POST /api/admin/grade
// body: { type: "exam"|"practice", answerId: string, isCorrect: boolean, comment?: string }
export async function POST(req: NextRequest) {
  const session = await getServerSession();
  try { await requireAdmin(session); } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { type, answerId, isCorrect, comment } = await req.json();

  if (!answerId || typeof isCorrect !== "boolean" || !["exam", "practice"].includes(type)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (type === "exam") {
    const answer = await prisma.examAnswer.findUnique({
      where: { id: answerId },
      include: {
        session: { select: { userId: true } },
        question: { select: { content: true } },
      },
    });
    if (!answer) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.examAnswer.update({
      where: { id: answerId },
      data: { isCorrect, comment: comment ?? null },
    });

    const allAnswers = await prisma.examAnswer.findMany({ where: { sessionId: answer.sessionId } });
    const newScore = allAnswers.filter(a => a.isCorrect === true).length;
    await prisma.examSession.update({ where: { id: answer.sessionId }, data: { objectiveScore: newScore } });

    await createAndPushNotification({
      recipientId: answer.session.userId,
      sessionType: "exam",
      sessionId: answer.sessionId,
      answerId,
      questionContent: answer.question.content,
    });
  } else {
    const answer = await prisma.practiceAnswer.findUnique({
      where: { id: answerId },
      include: {
        session: { select: { userId: true } },
        question: { select: { content: true } },
      },
    });
    if (!answer) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.practiceAnswer.update({
      where: { id: answerId },
      data: { isCorrect, comment: comment ?? null },
    });

    const allAnswers = await prisma.practiceAnswer.findMany({ where: { sessionId: answer.sessionId } });
    const newCount = allAnswers.filter(a => a.isCorrect === true).length;
    await prisma.practiceSession.update({ where: { id: answer.sessionId }, data: { correctCount: newCount } });

    await createAndPushNotification({
      recipientId: answer.session.userId,
      sessionType: "practice",
      sessionId: answer.sessionId,
      answerId,
      questionContent: answer.question.content,
    });
  }

  return NextResponse.json({ success: true });
}
