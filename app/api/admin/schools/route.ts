import { NextRequest, NextResponse } from "next/server";
import { getServerSession, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateSchoolCode } from "@/lib/account";
import { UserRole } from "@prisma/client";

export async function GET() {
  const session = await getServerSession();
  try {
    await requireAdmin(session);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const schools = await prisma.school.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        code: true,
        createdAt: true,
        _count: {
          select: {
            users: { where: { role: UserRole.TEACHER, deletedAt: null } },
          },
        },
      },
    });

    // Fetch student counts separately
    const schoolIds = schools.map((s) => s.id);
    const studentCounts = await prisma.user.groupBy({
      by: ["schoolId"],
      where: { schoolId: { in: schoolIds }, role: UserRole.STUDENT, deletedAt: null },
      _count: { id: true },
    });
    const studentCountMap = Object.fromEntries(
      studentCounts.map((r) => [r.schoolId!, r._count.id])
    );

    const result = schools.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      createdAt: s.createdAt,
      teacherCount: s._count.users,
      studentCount: studentCountMap[s.id] ?? 0,
    }));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  try {
    await requireAdmin(session);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { name, code } = await req.json();

    if (!name || !code) {
      return NextResponse.json({ error: "name and code are required" }, { status: 400 });
    }

    if (!validateSchoolCode(code)) {
      return NextResponse.json(
        { error: "学校编号格式错误，必须为4位字母数字" },
        { status: 400 }
      );
    }

    const existing = await prisma.school.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json({ error: "学校编号已存在" }, { status: 409 });
    }

    const school = await prisma.school.create({
      data: { name, code },
    });

    return NextResponse.json(school, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
