import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export async function DELETE(_req: Request, { params }: { params: { bankId: string; questionId: string } }) {
  const session = await getServerSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.TEACHER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 老师只能移除本校题库的题目
  if (session.user.role === UserRole.TEACHER) {
    const bank = await prisma.questionBank.findUnique({ where: { id: params.bankId } });
    if (!bank || !bank.schoolId || bank.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  await prisma.questionBankItem.deleteMany({
    where: { bankId: params.bankId, questionId: params.questionId },
  });
  return NextResponse.json({ success: true });
}
