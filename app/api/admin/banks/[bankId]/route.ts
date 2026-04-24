import { NextRequest, NextResponse } from "next/server";
import { getServerSession, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { bankId: string } }) {
  const session = await getServerSession();
  try { await requireAdmin(session); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  const body = await req.json();
  // 处理日期字段：字符串转 Date，null 保持 null
  const data: Record<string, unknown> = { ...body };
  if ("scheduledAt" in body) data.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
  if ("endAt" in body) data.endAt = body.endAt ? new Date(body.endAt) : null;

  const bank = await prisma.questionBank.update({ where: { id: params.bankId }, data });
  return NextResponse.json(bank);
}

export async function DELETE(_req: NextRequest, { params }: { params: { bankId: string } }) {
  const session = await getServerSession();
  try { await requireAdmin(session); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  await prisma.questionBank.delete({ where: { id: params.bankId } });
  return NextResponse.json({ success: true });
}
