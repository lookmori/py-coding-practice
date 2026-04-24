import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10)));
  const skip = (page - 1) * pageSize;

  const [total, items] = await Promise.all([
    prisma.notification.count({ where: { recipientId: session.user.id } }),
    prisma.notification.findMany({
      where: { recipientId: session.user.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        sessionType: true,
        sessionId: true,
        answerId: true,
        questionContent: true,
        isRead: true,
        createdAt: true,
      },
    }),
  ]);

  return NextResponse.json({
    items: items.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}
