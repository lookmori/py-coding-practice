import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/leaderboard/stream?bankId=xxx
// Server-Sent Events 实时推送排行榜
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bankId = searchParams.get("bankId");

  const encoder = new TextEncoder();

  async function getEntries() {
    const sessions = await prisma.practiceSession.findMany({
      where: {
        completedAt: { not: null },
        ...(bankId ? { bankId } : {}),
      },
      orderBy: { durationSecs: "asc" },
      take: 10,
      select: {
        id: true,
        participantName: true,
        durationSecs: true,
        correctCount: true,
      },
    });
    return sessions.map((s, i) => ({
      rank: i + 1,
      sessionId: s.id,
      participantName: s.participantName,
      durationSecs: s.durationSecs,
      correctCount: s.correctCount,
    }));
  }

  let closed = false;
  req.signal.addEventListener("abort", () => { closed = true; });

  const stream = new ReadableStream({
    async start(controller) {
      // 立即推送一次
      try {
        const entries = await getEntries();
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(entries)}\n\n`));
      } catch { /* ignore */ }

      // 每 5 秒推送一次
      const interval = setInterval(async () => {
        if (closed) { clearInterval(interval); try { controller.close(); } catch { /* already closed */ } return; }
        try {
          const entries = await getEntries();
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(entries)}\n\n`));
        } catch {
          clearInterval(interval);
          try { controller.close(); } catch { /* already closed */ }
        }
      }, 5000);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
