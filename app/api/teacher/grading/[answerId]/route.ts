import { NextRequest, NextResponse } from "next/server";
import { getServerSession, requireTeacher } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAndPushNotification } from "@/lib/notificationService";

export async function PUT(
  req: NextRequest,
  { params }: { params: { answerId: string } }
) {
  const session = await getServerSession();
  try {
    await requireTeacher(session);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { answerId } = params;
    const { type, isCorrect, comment } = await req.json();

    if (!answerId || typeof isCorrect !== "boolean" || !["exam", "practice"].includes(type)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const schoolId = session!.user.schoolId;
    if (!schoolId) {
      return NextResponse.json({ error: "Teacher has no school" }, { status: 400 });
    }

    if (type === "exam") {
      const answer = await prisma.examAnswer.findUnique({
        where: { id: answerId },
        include: {
          session: {
            include: { user: { select: { schoolId: true, id: true } } },
          },
          question: { select: { content: true } },
        },
      });

      if (!answer) {
        return NextResponse.json({ error: "Not Found" }, { status: 404 });
      }

      // Verify answer belongs to a student in teacher's school
      if (answer.session.user.schoolId !== schoolId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      await prisma.examAnswer.update({
        where: { id: answerId },
        data: { isCorrect, comment: comment ?? null },
      });

      const allAnswers = await prisma.examAnswer.findMany({
        where: { sessionId: answer.sessionId },
      });
      const newScore = allAnswers.filter((a) => a.isCorrect === true).length;
      await prisma.examSession.update({
        where: { id: answer.sessionId },
        data: { objectiveScore: newScore },
      });

      await createAndPushNotification({
        recipientId: answer.session.user.id,
        sessionType: "exam",
        sessionId: answer.sessionId,
        answerId,
        questionContent: answer.question.content,
      });
    } else {
      const answer = await prisma.practiceAnswer.findUnique({
        where: { id: answerId },
        include: {
          session: {
            include: { user: { select: { schoolId: true, id: true } } },
          },
          question: { select: { content: true } },
        },
      });

      if (!answer) {
        return NextResponse.json({ error: "Not Found" }, { status: 404 });
      }

      if (answer.session.user.schoolId !== schoolId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      await prisma.practiceAnswer.update({
        where: { id: answerId },
        data: { isCorrect, comment: comment ?? null },
      });

      const allAnswers = await prisma.practiceAnswer.findMany({
        where: { sessionId: answer.sessionId },
      });
      const newCount = allAnswers.filter((a) => a.isCorrect === true).length;
      await prisma.practiceSession.update({
        where: { id: answer.sessionId },
        data: { correctCount: newCount },
      });

      await createAndPushNotification({
        recipientId: answer.session.user.id,
        sessionType: "practice",
        sessionId: answer.sessionId,
        answerId,
        questionContent: answer.question.content,
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
