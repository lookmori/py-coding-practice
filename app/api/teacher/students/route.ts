import { NextRequest, NextResponse } from "next/server";
import { getServerSession, requireTeacher } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { validateAccountFormat } from "@/lib/account";
import bcrypt from "bcryptjs";

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

    const students = await prisma.user.findMany({
      where: { schoolId, role: UserRole.STUDENT, deletedAt: null },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        schoolId: true,
        teacherId: true,
        createdAt: true,
        lastLoginAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(students);
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  try {
    await requireTeacher(session);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const schoolId = session!.user.schoolId;
    const teacherId = session!.user.id;

    if (!schoolId) {
      return NextResponse.json({ error: "Teacher has no school" }, { status: 400 });
    }

    const { username, displayName, password } = await req.json();

    if (!username || !displayName || !password) {
      return NextResponse.json(
        { error: "username, displayName, password are required" },
        { status: 400 }
      );
    }

    if (!validateAccountFormat(username)) {
      return NextResponse.json(
        { error: "账号格式错误，必须为 {4位学校编号}_{用户名}" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json({ error: "用户名已存在" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const student = await prisma.user.create({
      data: {
        username,
        displayName,
        passwordHash,
        role: UserRole.STUDENT,
        schoolId,
        teacherId,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        schoolId: true,
        teacherId: true,
        createdAt: true,
      },
    });

    return NextResponse.json(student, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
