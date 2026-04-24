import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/leaderboard?bankId=xxx&limit=10
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bankId = searchParams.get("bankId");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);

    const sessions = await prisma.practiceSession.findMany({
      where: {
        completedAt: { not: null },
        ...(bankId ? { bankId } : {}),
      },
      orderBy: { durationSecs: "asc" },
      take: limit,
      select: {
        id: true,
        participantName: true,
        durationSecs: true,
        correctCount: true,
      },
    });

    const entries = sessions.map((session, index) => ({
      rank: index + 1,
      sessionId: session.id,
      participantName: session.participantName,
      durationSecs: session.durationSecs,
      correctCount: session.correctCount,
    }));

    return NextResponse.json({ entries });
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
