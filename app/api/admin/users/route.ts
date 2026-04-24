import { NextRequest, NextResponse } from "next/server";
import { getServerSession, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import {
  extractTeacherSequence,
  extractStudentSequence,
  generateTeacherAccount,
  generateStudentAccount,
  validateSchoolCode,
} from "@/lib/account";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  try {
    await requireAdmin(session);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const roleParam = searchParams.get("role");

    const roleFilter =
      roleParam && ["TEACHER", "STUDENT", "ADMIN"].includes(roleParam)
        ? (roleParam as UserRole)
        : undefined;

    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(roleFilter ? { role: roleFilter } : {}),
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        schoolId: true,
        teacherId: true,
        createdAt: true,
        lastLoginAt: true,
        school: { select: { id: true, name: true, code: true } },
        teacher: { select: { id: true, displayName: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(users);
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
    const body = await req.json();
    const { displayName, password, role, schoolId, teacherId } = body;

    if (!displayName || !password || !role) {
      return NextResponse.json(
        { error: "displayName, password, role are required" },
        { status: 400 }
      );
    }

    if (!["ADMIN", "TEACHER", "STUDENT"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    let username: string;
    let resolvedSchoolId: string | undefined = undefined;

    if (role === UserRole.TEACHER) {
      if (!schoolId) {
        return NextResponse.json({ error: "创建老师需要提供 schoolId" }, { status: 400 });
      }
      const school = await prisma.school.findUnique({ where: { id: schoolId } });
      if (!school) {
        return NextResponse.json({ error: "学校不存在" }, { status: 400 });
      }
      if (!validateSchoolCode(school.code)) {
        return NextResponse.json({ error: `学校编码「${school.code}」格式不合法` }, { status: 400 });
      }
      const teachers = await prisma.user.findMany({
        where: { schoolId, role: UserRole.TEACHER, deletedAt: null },
        select: { username: true },
      });
      const maxSeq = teachers
        .map(t => extractTeacherSequence(t.username))
        .filter((s): s is number => s !== null)
        .reduce((max, s) => Math.max(max, s), 0);
      const nextSeq = maxSeq + 1;
      if (nextSeq > 99) {
        return NextResponse.json({ error: `学校「${school.code}」老师账号序号已达上限 99` }, { status: 400 });
      }
      username = generateTeacherAccount(school.code, nextSeq);
      resolvedSchoolId = school.id;

    } else if (role === UserRole.STUDENT) {
      if (!schoolId || !teacherId) {
        return NextResponse.json({ error: "创建学生需要提供 schoolId 和 teacherId" }, { status: 400 });
      }
      const school = await prisma.school.findUnique({ where: { id: schoolId } });
      if (!school) {
        return NextResponse.json({ error: "学校不存在" }, { status: 400 });
      }
      const teacher = await prisma.user.findUnique({
        where: { id: teacherId },
        select: { schoolId: true, role: true },
      });
      if (!teacher || teacher.role !== UserRole.TEACHER) {
        return NextResponse.json({ error: "teacherId 无效" }, { status: 400 });
      }
      if (teacher.schoolId !== schoolId) {
        return NextResponse.json({ error: "学生所属学校与老师不一致" }, { status: 400 });
      }
      const students = await prisma.user.findMany({
        where: { schoolId, role: UserRole.STUDENT, deletedAt: null },
        select: { username: true },
      });
      const maxSeq = students
        .map(s => extractStudentSequence(s.username))
        .filter((s): s is number => s !== null)
        .reduce((max, s) => Math.max(max, s), 0);
      const nextSeq = maxSeq + 1;
      if (nextSeq > 9999) {
        return NextResponse.json({ error: `学校「${school.code}」学生账号序号已达上限 9999` }, { status: 400 });
      }
      username = generateStudentAccount(school.code, nextSeq);
      resolvedSchoolId = schoolId;

    } else {
      // ADMIN: 需要手动提供 username
      const { username: adminUsername } = body;
      if (!adminUsername) {
        return NextResponse.json({ error: "创建管理员需要提供 username" }, { status: 400 });
      }
      username = adminUsername;
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json({ error: "账号已存在（并发冲突），请重试" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        displayName,
        passwordHash,
        role: role as UserRole,
        schoolId: resolvedSchoolId ?? null,
        teacherId: role === UserRole.STUDENT ? teacherId : null,
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

    return NextResponse.json(user, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
