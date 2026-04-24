import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { sessionId: string } }
) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const practiceSession = await prisma.practiceSession.findUnique({
    where: { id: params.sessionId },
    include: {
      answers: {
        select: {
          userAnswer: true,
          isCorrect: true,
          isSkipped: true,
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

  if (!practiceSession) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  if (practiceSession.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ session: practiceSession });
}
