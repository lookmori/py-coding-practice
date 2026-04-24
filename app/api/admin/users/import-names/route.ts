import { NextRequest, NextResponse } from "next/server";
import { getServerSession, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// POST /api/admin/users/import-names
// body: { names: string[] }  — 每个名字一个元素
// 自动生成 8 位连贯账号（从当前最大账号 +1 开始），密码默认 123456
export async function POST(req: NextRequest) {
  const session = await getServerSession();
  try { await requireAdmin(session); } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { names } = await req.json() as { names: string[] };
  if (!Array.isArray(names) || names.length === 0) {
    return NextResponse.json({ error: "names array required" }, { status: 400 });
  }

  // 找到当前最大的 8 位纯数字账号，从下一个开始
  const allNumericUsers = await prisma.user.findMany({
    where: { username: { gte: "10000000", lte: "99999999" } },
    select: { username: true },
    orderBy: { username: "desc" },
    take: 1,
  });

  let nextNum = 10000001;
  if (allNumericUsers.length > 0) {
    const parsed = parseInt(allNumericUsers[0].username, 10);
    if (!isNaN(parsed) && parsed >= 10000000) {
      nextNum = parsed + 1;
    }
  }

  const defaultPassword = "123456";
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const created: { displayName: string; username: string }[] = [];
  const skipped: { name: string; reason: string }[] = [];

  for (const rawName of names) {
    const displayName = rawName.trim();
    if (!displayName) continue;

    const username = String(nextNum).padStart(8, "0");

    // 检查账号是否已存在（理论上不会，但防御性检查）
    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) {
      skipped.push({ name: displayName, reason: `账号 ${username} 已存在` });
      nextNum++;
      continue;
    }

    await prisma.user.create({
      data: { displayName, username, passwordHash, role: "USER" },
    });

    created.push({ displayName, username });
    nextNum++;
  }

  return NextResponse.json({
    success: created.length,
    skipped: skipped.length,
    created,
    errors: skipped,
  });
}
