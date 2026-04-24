import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
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
  });

  if (!practiceSession || practiceSession.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (practiceSession.completedAt !== null) {
    return NextResponse.json({ error: "已完成", sessionId }, { status: 409 });
  }

  const now = new Date();
  const durationSecs = Math.floor(
    (now.getTime() - practiceSession.startedAt.getTime()) / 1000
  );

  const correctCount = 0; // 编程题不自动判分，待教师人工批改后更新

  await prisma.practiceSession.update({
    where: { id: sessionId },
    data: { completedAt: now, durationSecs, correctCount },
  });

  return NextResponse.json({ sessionId, durationSecs, correctCount });
}
