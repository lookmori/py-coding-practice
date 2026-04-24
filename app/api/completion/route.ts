import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { calculateCompletionRate, truncateContent } from "@/lib/utils";

export async function GET() {
  try {
    const [questions, completedSessions] = await Promise.all([
      prisma.question.findMany({
        select: { id: true, content: true },
      }),
      prisma.practiceSession.findMany({
        where: { completedAt: { not: null } },
        select: { id: true },
      }),
    ]);

    const totalSessions = completedSessions.length;
    const completedSessionIds = completedSessions.map((s) => s.id);

    // Count answered (non-skipped) answers per question from completed sessions
    const answeredCounts = await prisma.practiceAnswer.groupBy({
      by: ["questionId"],
      where: {
        sessionId: { in: completedSessionIds },
        isSkipped: false,
      },
      _count: { id: true },
    });

    const answeredMap = new Map(
      answeredCounts.map((r) => [r.questionId, r._count.id])
    );

    const items = questions
      .map((q) => {
        const answeredCount = answeredMap.get(q.id) ?? 0;
        const completionRate = calculateCompletionRate(answeredCount, totalSessions);
        return {
          questionId: q.id,
          contentPreview: truncateContent(q.content, 50),
          completionRate,
          answeredCount,
          totalSessions,
        };
      })
      .sort((a, b) => a.completionRate - b.completionRate);

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Completion error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
