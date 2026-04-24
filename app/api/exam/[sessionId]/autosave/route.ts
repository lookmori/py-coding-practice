import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
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
    return NextResponse.json({ error: "已提交" }, { status: 409 });
  }

  const { answers } = await req.json() as {
    answers: { questionId: string; userAnswer: string | null }[];
  };

  await Promise.all(
    answers.map((a) =>
      prisma.examAnswer.upsert({
        where: { sessionId_questionId: { sessionId, questionId: a.questionId } },
        update: { userAnswer: a.userAnswer, savedAt: new Date() },
        create: { sessionId, questionId: a.questionId, userAnswer: a.userAnswer },
      })
    )
  );

  return NextResponse.json({ success: true });
}
