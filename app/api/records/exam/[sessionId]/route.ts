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

  if (!examSession) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  if (examSession.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ session: examSession });
}
