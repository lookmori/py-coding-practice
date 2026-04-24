import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BankVisibility } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bankId } = await req.json().catch(() => ({}));
  if (!bankId) return NextResponse.json({ error: "bankId required" }, { status: 400 });

  const bank = await prisma.questionBank.findUnique({
    where: { id: bankId, type: "PRACTICE", isActive: true },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: { question: true },
      },
    },
  });

  if (!bank) return NextResponse.json({ error: "题库不存在或已停用" }, { status: 404 });

  // Visibility check: PRIVATE banks only accessible to students of the same school
  // Admin bypasses; PRIVATE with no schoolId is accessible to all authenticated users
  if (bank.visibility === BankVisibility.PRIVATE && session.user.role !== "ADMIN" && bank.schoolId !== null) {
    const userSchoolId = session.user.schoolId;
    if (!userSchoolId || bank.schoolId !== userSchoolId) {
      return NextResponse.json({ error: "题库不存在或已停用" }, { status: 404 });
    }
  }

  const questions = bank.questions
    .map(item => item.question)
    .filter(q => q.type === "CODING");

  const practiceSession = await prisma.practiceSession.create({
    data: {
      userId: session.user.id,
      bankId,
      participantName: session.user.displayName,
    },
  });

  return NextResponse.json({ sessionId: practiceSession.id, questions });
}
