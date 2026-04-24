import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/practice/[sessionId]/answers-batch
// 一次性批量 upsert 所有答案，替代逐题发请求
export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = params;
  const practiceSession = await prisma.practiceSession.findUnique({
    where: { id: sessionId },
  });

  if (!practiceSession || practiceSession.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as {
    answers: { questionId: string; userAnswer: string | null; isSkipped: boolean }[];
  };

  if (!Array.isArray(body.answers)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // 所有练习题均为编程题，isCorrect 始终为 null，待教师人工批改
  await prisma.$transaction(
    body.answers.map((a) => {
      return prisma.practiceAnswer.upsert({
        where: { sessionId_questionId: { sessionId, questionId: a.questionId } },
        update: {
          userAnswer: a.isSkipped ? null : a.userAnswer,
          isCorrect: null,
          isSkipped: a.isSkipped,
          answeredAt: new Date(),
        },
        create: {
          sessionId,
          questionId: a.questionId,
          userAnswer: a.isSkipped ? null : a.userAnswer,
          isCorrect: null,
          isSkipped: a.isSkipped,
        },
      });
    })
  );

  return NextResponse.json({ success: true });
}
