import { NextResponse } from "next/server";
import { getServerSession, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession();
  try {
    await requireAdmin(session);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [examSessions, practiceSessions] = await Promise.all([
    prisma.examSession.findMany({
      select: {
        id: true,
        startedAt: true,
        objectiveScore: true,
        switchCount: true,
        user: { select: { displayName: true } },
      },
      orderBy: { startedAt: "desc" },
    }),
    prisma.practiceSession.findMany({
      select: {
        id: true,
        participantName: true,
        startedAt: true,
        correctCount: true,
        durationSecs: true,
      },
      orderBy: { startedAt: "desc" },
    }),
  ]);

  return NextResponse.json({ examSessions, practiceSessions });
}
