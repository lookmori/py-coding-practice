import { NextRequest, NextResponse } from "next/server";
import { getServerSession, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// POST /api/admin/users/reset-password
// body: { userIds: string[], password: string }
export async function POST(req: NextRequest) {
  const session = await getServerSession();
  try { await requireAdmin(session); } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userIds, password } = await req.json() as { userIds: string[]; password: string };

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json({ error: "userIds required" }, { status: 400 });
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ error: "密码至少 6 位" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.updateMany({
    where: { id: { in: userIds } },
    data: { passwordHash },
  });

  return NextResponse.json({ success: userIds.length });
}
