import { NextRequest, NextResponse } from "next/server";
import { getServerSession, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: { questionId: string } }
) {
  const session = await getServerSession();
  try {
    await requireAdmin(session);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { questionId } = params;

  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question) {
    return NextResponse.json({ error: "题目不存在" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const allowedFields = [
    "content", "category", "optionA", "optionB", "optionC", "optionD",
    "correctAnswer", "description", "scoringCriteria",
  ];

  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      updateData[field] = body[field];
    }
  }

  const updated = await prisma.question.update({
    where: { id: questionId },
    data: updateData,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { questionId: string } }
) {
  const session = await getServerSession();
  try {
    await requireAdmin(session);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { questionId } = params;

  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question) {
    return NextResponse.json({ error: "题目不存在" }, { status: 404 });
  }

  await prisma.question.delete({ where: { id: questionId } });

  return NextResponse.json({ success: true });
}
