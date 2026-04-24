import { NextRequest, NextResponse } from "next/server";
import { getServerSession, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PUT(req: NextRequest) {
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
  const errors: { index: number; userId?: string; reason: string }[] = [];

  for (let i = 0; i < body.length; i++) {
    const item = body[i] as Record<string, unknown>;
    const { userId, displayName, username, password } = item ?? {};

    if (!userId || typeof userId !== "string") {
      skipped++;
      errors.push({ index: i, reason: "缺少 userId" });
      continue;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      skipped++;
      errors.push({ index: i, userId, reason: "用户不存在" });
      continue;
    }

    const updateData: Record<string, unknown> = {};
    if (typeof displayName === "string") updateData.displayName = displayName;
    if (typeof username === "string") updateData.username = username;
    if (typeof password === "string") {
      updateData.passwordHash = await bcrypt.hash(password, 12);
    }

    await prisma.user.update({ where: { id: userId }, data: updateData });
    success++;
  }

  return NextResponse.json({ success, skipped, errors });
}
