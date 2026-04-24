import { NextRequest, NextResponse } from "next/server";
import { getServerSession, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  try {
    await requireAdmin(session);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body)) {
    return NextResponse.json({ error: "Expected JSON array" }, { status: 400 });
  }

  let success = 0;
  let skipped = 0;
  const errors: { index: number; username?: string; reason: string }[] = [];

  for (let i = 0; i < body.length; i++) {
    const item = body[i] as Record<string, unknown>;
    const { displayName, username, password } = item ?? {};

    if (!displayName || !username || !password) {
      skipped++;
      errors.push({ index: i, username: typeof username === "string" ? username : undefined, reason: "缺少必填字段" });
      continue;
    }

    if (typeof displayName !== "string" || typeof username !== "string" || typeof password !== "string") {
      skipped++;
      errors.push({ index: i, reason: "字段类型错误" });
      continue;
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      skipped++;
      errors.push({ index: i, username, reason: "用户名已存在" });
      continue;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: { displayName, username, passwordHash, role: "USER" },
    });
    success++;
  }

  return NextResponse.json({ success, skipped, errors });
}
