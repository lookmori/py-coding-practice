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

  const [totalUsers, totalExamSessions, totalPracticeSessions] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.examSession.count(),
    prisma.practiceSession.count(),
  ]);

  return NextResponse.json({ totalUsers, totalExamSessions, totalPracticeSessions });
}
