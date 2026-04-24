import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessions = await prisma.examSession.findMany({
    where: { userId: session.user.id },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      startedAt: true,
      submittedAt: true,
      objectiveScore: true,
      switchCount: true,
      durationSecs: true,
      _count: { select: { answers: true } },
    },
  });

  return NextResponse.json({ sessions });
}
