import { NextRequest, NextResponse } from "next/server";
import { getServerSession, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import {
  SCHOOL_CODE_REGEX,
  extractTeacherSequence,
  extractStudentSequence,
  generateTeacherAccount,
  generateStudentAccount,
} from "@/lib/account";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";

// ─── 类型定义 ────────────────────────────────────────────────────────────────

interface TeacherRow {
  schoolName: string;
  schoolCode: string;
  displayName: string;
  password?: string;
  sourceLineNumber: number;
}

interface StudentRow {
  displayName: string;
  teacherUsername: string;
  password?: string;
  sourceLineNumber: number;
}

interface ParseError {
  row: number;
  reason: string;
}

interface SchoolGroup {
  schoolName: string;
  schoolCode: string;
  created: { displayName: string; username: string }[];
}

// ─── CSV 解析函数（纯函数，不依赖 DB）────────────────────────────────────────

/**
 * 解析老师导入 CSV。
 * 支持多学校块，块头行格式：`学校名称,学校编码`（恰好2个字段，第2个字段符合 SCHOOL_CODE_REGEX）。
 * 数据行格式：`显示名称[,初始密码]`
 */
export function parseTeacherCsv(csv: string): { rows: TeacherRow[]; errors: ParseError[] } {
  const rows: TeacherRow[] = [];
  const errors: ParseError[] = [];

  const rawLines = csv.split("\n");

  let currentSchoolName: string | null = null;
  let currentSchoolCode: string | null = null;
  let currentSchoolValid = false;

  for (let i = 0; i < rawLines.length; i++) {
    const lineNumber = i + 1;
    const line = rawLines[i].trim();

    // 跳过空行
    if (!line) continue;

    // 跳过注释行
    if (line.startsWith("#")) continue;

    const parts = line.split(",").map((s) => s.trim());

    // 块头行识别：恰好2个字段，且第2个字段符合 SCHOOL_CODE_REGEX
    if (parts.length === 2 && SCHOOL_CODE_REGEX.test(parts[1])) {
      currentSchoolName = parts[0];
      currentSchoolCode = parts[1];
      currentSchoolValid = true;
      continue;
    }

    // 检查是否有非法学校编码的疑似块头行（2个字段但编码不合法）
    if (parts.length === 2 && !SCHOOL_CODE_REGEX.test(parts[1])) {
      // 可能是块头行但编码非法，也可能是数据行（显示名称,密码）
      // 判断依据：若第2个字段不像密码（即看起来像学校编码但格式错误），记录错误并跳过该块
      // 为了简化，我们检查第2个字段是否"像"学校编码（长度接近4位字母数字但不完全符合）
      // 实际上，数据行的第2个字段是密码，可以是任意字符串
      // 因此这里不能简单判断，按数据行处理（显示名称,密码）
      // 只有当第2个字段符合 SCHOOL_CODE_REGEX 时才视为块头行
    }

    // 数据行处理
    if (currentSchoolCode === null) {
      // 数据行出现在任何块头行之前
      errors.push({ row: lineNumber, reason: "数据行出现在学校块头行之前，已跳过" });
      continue;
    }

    if (!currentSchoolValid) {
      // 当前学校块无效（编码非法），跳过
      continue;
    }

    const displayName = parts[0];
    const password = parts[1] || undefined;

    if (!displayName) {
      errors.push({ row: lineNumber, reason: "显示名称为空，已跳过" });
      continue;
    }

    rows.push({
      schoolName: currentSchoolName!,
      schoolCode: currentSchoolCode!,
      displayName,
      password,
      sourceLineNumber: lineNumber,
    });
  }

  return { rows, errors };
}

/**
 * 解析学生导入 CSV。
 * 每行格式：`显示名称,老师账号[,初始密码]`
 */
export function parseStudentCsv(csv: string): { rows: StudentRow[]; errors: ParseError[] } {
  const rows: StudentRow[] = [];
  const errors: ParseError[] = [];

  const rawLines = csv.split("\n");

  for (let i = 0; i < rawLines.length; i++) {
    const lineNumber = i + 1;
    const line = rawLines[i].trim();

    // 跳过空行
    if (!line) continue;

    // 跳过注释行
    if (line.startsWith("#")) continue;

    const parts = line.split(",").map((s) => s.trim());
    const displayName = parts[0];
    const teacherUsername = parts[1];
    const password = parts[2] || undefined;

    if (!displayName) {
      errors.push({ row: lineNumber, reason: "显示名称为空，已跳过" });
      continue;
    }

    if (!teacherUsername) {
      errors.push({ row: lineNumber, reason: "老师账号为空，已跳过" });
      continue;
    }

    rows.push({
      displayName,
      teacherUsername,
      password,
      sourceLineNumber: lineNumber,
    });
  }

  return { rows, errors };
}

// ─── 序号查询函数 ─────────────────────────────────────────────────────────────

/**
 * 查询该学校所有老师账号，提取序号，返回 max+1（无账号时返回 1）
 */
async function getNextTeacherSequence(
  schoolId: string,
  db: typeof prisma
): Promise<number> {
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

/**
 * 查询该学校所有学生账号，提取序号，返回 max+1（无账号时返回 1）
 */
async function getNextStudentSequence(
  schoolId: string,
  db: typeof prisma
): Promise<number> {
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

// ─── 结果聚合函数 ─────────────────────────────────────────────────────────────

/**
 * 将 created 列表按 schoolCode 分组，构造 SchoolGroup[]
 */
export function buildSchoolGroups(
  created: { displayName: string; username: string; schoolName: string; schoolCode: string }[]
): SchoolGroup[] {
  const map = new Map<string, SchoolGroup>();

  for (const item of created) {
    if (!map.has(item.schoolCode)) {
      map.set(item.schoolCode, {
        schoolName: item.schoolName,
        schoolCode: item.schoolCode,
        created: [],
      });
    }
    map.get(item.schoolCode)!.created.push({
      displayName: item.displayName,
      username: item.username,
    });
  }

  return Array.from(map.values());
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
      // ── 老师导入流程 ──────────────────────────────────────────────────────

      const { rows, errors: parseErrors } = parseTeacherCsv(csv as string);
      errors.push(...parseErrors);

      if (rows.length === 0 && parseErrors.length === 0) {
        return NextResponse.json({ error: "CSV 无有效数据行" }, { status: 400 });
      }

      // 按学校分组
      const schoolMap = new Map<string, { schoolName: string; rows: TeacherRow[] }>();
      for (const row of rows) {
        if (!schoolMap.has(row.schoolCode)) {
          schoolMap.set(row.schoolCode, { schoolName: row.schoolName, rows: [] });
        }
        schoolMap.get(row.schoolCode)!.rows.push(row);
      }

      for (const [schoolCode, { schoolName, rows: schoolRows }] of Array.from(schoolMap)) {
        // 确保学校存在
        const school = await prisma.school.upsert({
          where: { code: schoolCode },
          update: {},
          create: { name: schoolName, code: schoolCode },
        });

        // 获取起始序号
        let currentSeq = await getNextTeacherSequence(school.id, prisma);

        for (const row of schoolRows) {
          // 序号超出上限
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
            createdWithMeta.push({
              displayName: row.displayName,
              username,
              schoolName,
              schoolCode,
            });
          } catch (err) {
            if (
              err instanceof Prisma.PrismaClientKnownRequestError &&
              err.code === "P2002"
            ) {
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
      // ── 学生导入流程 ──────────────────────────────────────────────────────

      const { rows, errors: parseErrors } = parseStudentCsv(csv as string);
      errors.push(...parseErrors);

      if (rows.length === 0 && parseErrors.length === 0) {
        return NextResponse.json({ error: "CSV 无有效数据行" }, { status: 400 });
      }

      // 缓存老师查询
      const teacherCache = new Map<
        string,
        { id: string; schoolId: string | null; school: { name: string; code: string } | null }
      >();

      // 按学校维护序号 Map
      const seqMap = new Map<string, number>();

      for (const row of rows) {
        // 查询老师（带缓存）
        if (!teacherCache.has(row.teacherUsername)) {
          const teacher = await prisma.user.findFirst({
            where: { username: row.teacherUsername, role: UserRole.TEACHER, deletedAt: null },
            select: {
              id: true,
              schoolId: true,
              school: { select: { name: true, code: true } },
            },
          });
          if (teacher) {
            teacherCache.set(row.teacherUsername, teacher);
          }
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

        const schoolId = teacher.schoolId;
        const schoolCode = teacher.school.code;
        const schoolName = teacher.school.name;

        // 首次查询该学校的起始序号
        if (!seqMap.has(schoolId)) {
          const nextSeq = await getNextStudentSequence(schoolId, prisma);
          seqMap.set(schoolId, nextSeq);
        }

        const currentSeq = seqMap.get(schoolId)!;

        // 序号超出上限
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
          createdWithMeta.push({
            displayName: row.displayName,
            username,
            schoolName,
            schoolCode,
          });
        } catch (err) {
          if (
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === "P2002"
          ) {
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

    // CSV 完全为空或无有效行
    if (createdWithMeta.length === 0 && errors.length === 0) {
      return NextResponse.json({ error: "CSV 无有效数据行" }, { status: 400 });
    }

    const schoolGroups = buildSchoolGroups(createdWithMeta);
    const created = createdWithMeta.map(({ displayName, username }) => ({ displayName, username }));

    return NextResponse.json({
      success: createdWithMeta.length,
      created,
      errors,
      schoolGroups,
    });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
