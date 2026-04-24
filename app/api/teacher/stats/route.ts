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

    const [studentCount, examSessionCount, practiceSessionCount] = await Promise.all([
      prisma.user.count({
        where: { schoolId, role: UserRole.STUDENT, deletedAt: null },
      }),
      prisma.examSession.count({
        where: { user: { schoolId, role: UserRole.STUDENT, deletedAt: null } },
      }),
      prisma.practiceSession.count({
        where: { user: { schoolId, role: UserRole.STUDENT, deletedAt: null } },
      }),
    ]);

    return NextResponse.json({ studentCount, examSessionCount, practiceSessionCount });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
