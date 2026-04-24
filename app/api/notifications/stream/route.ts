import { NextRequest } from "next/server";
import { getServerSession } from "@/lib/auth";
import { registerSSE, unregisterSSE } from "@/lib/sseStore";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  if (session.user.role !== "STUDENT") {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }

  const userId = session.user.id;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      registerSSE(userId, controller);

      // Send initial ping
      try {
        controller.enqueue(encoder.encode(`: ping\n\n`));
      } catch {}

      // Heartbeat every 25 seconds
      const interval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(interval);
        }
      }, 25000);

      // Cleanup on disconnect
      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        unregisterSSE(userId);
        try { controller.close(); } catch {}
      });
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
