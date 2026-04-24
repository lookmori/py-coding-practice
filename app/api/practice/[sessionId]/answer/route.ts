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
  const practiceSession = await prisma.practiceSession.findUnique({
    where: { id: sessionId },
  });

  if (!practiceSession || practiceSession.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { questionId, userAnswer, isSkipped } = await req.json();

  let data: {
    userAnswer: string | null;
    isCorrect: boolean | null;
    isSkipped: boolean;
    answeredAt: Date;
  };

  if (isSkipped) {
    data = {
      userAnswer: null,
      isCorrect: null,
      isSkipped: true,
      answeredAt: new Date(),
    };
  } else {
    data = {
      userAnswer: userAnswer ?? null,
      isCorrect: null,
      isSkipped: false,
      answeredAt: new Date(),
    };
  }

  await prisma.practiceAnswer.upsert({
    where: { sessionId_questionId: { sessionId, questionId } },
    update: data,
    create: { sessionId, questionId, ...data },
  });

  return NextResponse.json({ success: true });
}
