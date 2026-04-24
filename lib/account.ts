// School_Code: 固定 4 位字母数字
export const SCHOOL_CODE_REGEX = /^[A-Za-z0-9]{4}$/;

// 老师账号格式: {4位School_Code}LS{2位序号}，共8位，如 XS01LS07
export const TEACHER_ACCOUNT_REGEX = /^[A-Za-z0-9]{4}LS\d{2}$/;

// 学生账号格式: {4位School_Code}{4位序号}，共8位，如 XS010042
export const STUDENT_ACCOUNT_REGEX = /^[A-Za-z0-9]{4}\d{4}$/;

export function validateSchoolCode(code: string): boolean {
  return SCHOOL_CODE_REGEX.test(code);
}

export function validateAccountFormat(username: string): boolean {
  return TEACHER_ACCOUNT_REGEX.test(username) || STUDENT_ACCOUNT_REGEX.test(username);
}

/**
 * 从账号中提取学校编码（前4位）。
 * 兼容老师账号（XS01LS07）和学生账号（XS010042）。
 * 格式不合法时返回 null。
 */
export function extractSchoolCodeFromAccount(username: string): string | null {
  if (!validateAccountFormat(username)) return null;
  return username.substring(0, 4);
}

/**
 * 从老师账号中提取序号（后2位数字）。
 * 例：XS01LS07 → 7
 * 格式不合法时返回 null。
 */
export function extractTeacherSequence(username: string): number | null {
  if (!TEACHER_ACCOUNT_REGEX.test(username)) return null;
  return parseInt(username.substring(6, 8), 10);
}

/**
 * 从学生账号中提取序号（后4位数字）。
 * 例：XS010042 → 42
 * 格式不合法时返回 null。
 */
export function extractStudentSequence(username: string): number | null {
  if (!STUDENT_ACCOUNT_REGEX.test(username)) return null;
  return parseInt(username.substring(4, 8), 10);
}

/**
 * 生成老师账号，序号左补零到2位。
 * 例：generateTeacherAccount("XS01", 3) → "XS01LS03"
 * sequence 超出 1-99 范围时抛出 Error。
 */
export function generateTeacherAccount(schoolCode: string, sequence: number): string {
  if (sequence < 1 || sequence > 99) {
    throw new Error(`老师账号序号超出范围：${sequence}，有效范围为 1-99`);
  }
  const paddedSeq = String(sequence).padStart(2, "0");
  return `${schoolCode}LS${paddedSeq}`;
}

/**
 * 生成学生账号，序号左补零到4位。
 * 例：generateStudentAccount("XS01", 12) → "XS010012"
 * sequence 超出 1-9999 范围时抛出 Error。
 */
export function generateStudentAccount(schoolCode: string, sequence: number): string {
  if (sequence < 1 || sequence > 9999) {
    throw new Error(`学生账号序号超出范围：${sequence}，有效范围为 1-9999`);
  }
  const paddedSeq = String(sequence).padStart(4, "0");
  return `${schoolCode}${paddedSeq}`;
}
