import { NextRequest, NextResponse } from "next/server";
import { getServerSession, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import {
  extractTeacherSequence,
  extractStudentSequence,
  generateTeacherAccount,
  generateStudentAccount,
} from "@/lib/account";
import {
  parseTeacherCsv,
  parseStudentCsv,
  buildSchoolGroups,
  type ParseError,
} from "@/lib/bulkImportUtils";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";

// ─── 序号查询函数 ─────────────────────────────────────────────────────────────

async function getNextTeacherSequence(schoolId: string, db: typeof prisma): Promise<number> {
  const teachers = await db.user.findMany({
    where: { schoolId, role: UserRole.TEACHER, deletedAt: null },
    select: { username: true },
  });
  if (teachers.length === 0) return 1;
  const sequences = teachers
    .map((t) => extractTeacherSequence(t.username))
    .filter((s): s is number => s !== null);
  if (sequences.length === 0) return 1;
  return Math.max(...sequences) + 1;
}

async function getNextStudentSequence(schoolId: string, db: typeof prisma): Promise<number> {
  const students = await db.user.findMany({
    where: { schoolId, role: UserRole.STUDENT, deletedAt: null },
    select: { username: true },
  });
  if (students.length === 0) return 1;
  const sequences = students
    .map((s) => extractStudentSequence(s.username))
    .filter((s): s is number => s !== null);
  if (sequences.length === 0) return 1;
  return Math.max(...sequences) + 1;
}

// ─── POST 处理器 ──────────────────────────────────────────────────────────────

const DEFAULT_PASSWORD = "123456";

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  try {
    await requireAdmin(session);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { type, csv } = await req.json();

    if (!["TEACHER", "STUDENT"].includes(type) || !csv) {
      return NextResponse.json({ error: "type and csv are required" }, { status: 400 });
    }

    const errors: ParseError[] = [];
    const createdWithMeta: {
      displayName: string;
      username: string;
      schoolName: string;
      schoolCode: string;
    }[] = [];

    if (type === "TEACHER") {
      const { rows, errors: parseErrors } = parseTeacherCsv(csv as string);
      errors.push(...parseErrors);

      if (rows.length === 0 && parseErrors.length === 0) {
        return NextResponse.json({ error: "CSV 无有效数据行" }, { status: 400 });
      }

      const schoolMap = new Map<string, { schoolName: string; rows: typeof rows }>();
      for (const row of rows) {
        if (!schoolMap.has(row.schoolCode)) {
          schoolMap.set(row.schoolCode, { schoolName: row.schoolName, rows: [] });
        }
        schoolMap.get(row.schoolCode)!.rows.push(row);
      }

      for (const [schoolCode, { schoolName, rows: schoolRows }] of Array.from(schoolMap)) {
        const school = await prisma.school.upsert({
          where: { code: schoolCode },
          update: {},
          create: { name: schoolName, code: schoolCode },
        });

        let currentSeq = await getNextTeacherSequence(school.id, prisma);

        for (const row of schoolRows) {
          if (currentSeq > 99) {
            errors.push({
              row: row.sourceLineNumber,
              reason: `学校「${schoolCode}」老师账号序号已达上限 99，无法继续创建`,
            });
            continue;
          }

          const username = generateTeacherAccount(schoolCode, currentSeq);
          currentSeq++;

          const passwordHash = await bcrypt.hash(row.password || DEFAULT_PASSWORD, 10);

          try {
            await prisma.user.create({
              data: {
                username,
                displayName: row.displayName,
                passwordHash,
                role: UserRole.TEACHER,
                schoolId: school.id,
              },
            });
            createdWithMeta.push({ displayName: row.displayName, username, schoolName, schoolCode });
          } catch (err) {
            if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
              errors.push({
                row: row.sourceLineNumber,
                reason: `账号「${username}」已存在（并发冲突），已跳过`,
              });
            } else {
              throw err;
            }
          }
        }
      }
    } else {
      const { rows, errors: parseErrors } = parseStudentCsv(csv as string);
      errors.push(...parseErrors);

      if (rows.length === 0 && parseErrors.length === 0) {
        return NextResponse.json({ error: "CSV 无有效数据行" }, { status: 400 });
      }

      const teacherCache = new Map<
        string,
        { id: string; schoolId: string | null; school: { name: string; code: string } | null }
      >();
      const seqMap = new Map<string, number>();

      for (const row of rows) {
        if (!teacherCache.has(row.teacherUsername)) {
          const teacher = await prisma.user.findFirst({
            where: { username: row.teacherUsername, role: UserRole.TEACHER, deletedAt: null },
            select: { id: true, schoolId: true, school: { select: { name: true, code: true } } },
          });
          if (teacher) teacherCache.set(row.teacherUsername, teacher);
        }

        const teacher = teacherCache.get(row.teacherUsername);

        if (!teacher) {
          errors.push({
            row: row.sourceLineNumber,
            reason: `老师账号「${row.teacherUsername}」不存在或角色不为 TEACHER，已跳过`,
          });
          continue;
        }

        if (!teacher.schoolId || !teacher.school) {
          errors.push({
            row: row.sourceLineNumber,
            reason: `老师账号「${row.teacherUsername}」未关联学校，已跳过`,
          });
          continue;
        }

        const { schoolId, school: { code: schoolCode, name: schoolName } } = teacher;

        if (!seqMap.has(schoolId)) {
          seqMap.set(schoolId, await getNextStudentSequence(schoolId, prisma));
        }

        const currentSeq = seqMap.get(schoolId)!;

        if (currentSeq > 9999) {
          errors.push({
            row: row.sourceLineNumber,
            reason: `学校「${schoolCode}」学生账号序号已达上限 9999，无法继续创建`,
          });
          continue;
        }

        const username = generateStudentAccount(schoolCode, currentSeq);
        seqMap.set(schoolId, currentSeq + 1);

        const passwordHash = await bcrypt.hash(row.password || DEFAULT_PASSWORD, 10);

        try {
          await prisma.user.create({
            data: {
              username,
              displayName: row.displayName,
              passwordHash,
              role: UserRole.STUDENT,
              schoolId,
              teacherId: teacher.id,
            },
          });
          createdWithMeta.push({ displayName: row.displayName, username, schoolName, schoolCode });
        } catch (err) {
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
            errors.push({
              row: row.sourceLineNumber,
              reason: `账号「${username}」已存在（并发冲突），已跳过`,
            });
          } else {
            throw err;
          }
        }
      }
    }

    if (createdWithMeta.length === 0 && errors.length === 0) {
      return NextResponse.json({ error: "CSV 无有效数据行" }, { status: 400 });
    }

    const schoolGroups = buildSchoolGroups(createdWithMeta);
    const created = createdWithMeta.map(({ displayName, username }) => ({ displayName, username }));

    return NextResponse.json({ success: createdWithMeta.length, created, errors, schoolGroups });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
