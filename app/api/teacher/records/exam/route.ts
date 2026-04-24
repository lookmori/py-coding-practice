import { NextResponse } from "next/server";
import { getServerSession, requireTeacher } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export async function GET() {
  const session = await getServerSession();
  try {
    await requireTeacher(session);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const schoolId = session!.user.schoolId;
    if (!schoolId) {
      return NextResponse.json({ error: "Teacher has no school" }, { status: 400 });
    }

    const examSessions = await prisma.examSession.findMany({
      where: {
        user: { schoolId, role: UserRole.STUDENT, deletedAt: null },
      },
      select: {
        id: true,
        startedAt: true,
        submittedAt: true,
        objectiveScore: true,
        switchCount: true,
        durationSecs: true,
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            schoolId: true,
          },
        },
        bank: { select: { id: true, name: true } },
      },
      orderBy: { startedAt: "desc" },
    });

    return NextResponse.json(examSessions);
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
