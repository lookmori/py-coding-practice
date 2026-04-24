import { SCHOOL_CODE_REGEX } from "@/lib/account";

// ─── 类型定义 ────────────────────────────────────────────────────────────────

export interface TeacherRow {
  schoolName: string;
  schoolCode: string;
  displayName: string;
  password?: string;
  sourceLineNumber: number;
}

export interface StudentRow {
  displayName: string;
  teacherUsername: string;
  password?: string;
  sourceLineNumber: number;
}

export interface ParseError {
  row: number;
  reason: string;
}

export interface SchoolGroup {
  schoolName: string;
  schoolCode: string;
  created: { displayName: string; username: string }[];
}

// ─── CSV 解析函数 ─────────────────────────────────────────────────────────────

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

    if (!line) continue;
    if (line.startsWith("#")) continue;

    const parts = line.split(",").map((s) => s.trim());

    // 块头行识别：恰好2个字段，且第2个字段符合 SCHOOL_CODE_REGEX
    if (parts.length === 2 && SCHOOL_CODE_REGEX.test(parts[1])) {
      currentSchoolName = parts[0];
      currentSchoolCode = parts[1];
      currentSchoolValid = true;
      continue;
    }

    // 数据行处理
    if (currentSchoolCode === null) {
      errors.push({ row: lineNumber, reason: "数据行出现在学校块头行之前，已跳过" });
      continue;
    }

    if (!currentSchoolValid) continue;

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

    if (!line) continue;
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

    rows.push({ displayName, teacherUsername, password, sourceLineNumber: lineNumber });
  }

  return { rows, errors };
}

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
