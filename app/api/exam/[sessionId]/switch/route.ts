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
  const examSession = await prisma.examSession.findUnique({
    where: { id: sessionId },
  });

  if (!examSession || examSession.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.switchEvent.create({
    data: { sessionId, occurredAt: new Date() },
  });

  const updatedSession = await prisma.examSession.update({
    where: { id: sessionId },
    data: { switchCount: { increment: 1 } },
  });

  return NextResponse.json({ switchCount: updatedSession.switchCount });
}
