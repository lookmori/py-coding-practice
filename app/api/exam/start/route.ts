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
    where: { id: bankId, type: "EXAM", isActive: true },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: { question: true },
      },
    },
  });

  if (!bank) return NextResponse.json({ error: "题库不存在或已停用" }, { status: 404 });

  // Visibility check — admin bypasses; PRIVATE with no schoolId accessible to all
  if (bank.visibility === BankVisibility.PRIVATE && session.user.role !== "ADMIN" && bank.schoolId !== null) {
    const userSchoolId = session.user.schoolId;
    if (!userSchoolId || bank.schoolId !== userSchoolId) {
      return NextResponse.json({ error: "题库不存在或已停用" }, { status: 404 });
    }
  }

  // Schedule check
  const now = new Date();
  if (bank.scheduledAt && now < bank.scheduledAt) {
    return NextResponse.json({
      error: "考试尚未开始",
      scheduledAt: bank.scheduledAt.toISOString(),
    }, { status: 403 });
  }
  if (bank.endAt && now > bank.endAt) {
    return NextResponse.json({ error: "考试已结束，无法参加" }, { status: 403 });
  }

  // 计算实际可用时长：若有截止时间，取 min(题库时长, 截止时间剩余秒数)
  let effectiveDuration = bank.durationSecs;
  if (bank.endAt) {
    const remainingSecs = Math.floor((bank.endAt.getTime() - now.getTime()) / 1000);
    effectiveDuration = Math.min(bank.durationSecs, remainingSecs);
    if (effectiveDuration <= 0) {
      return NextResponse.json({ error: "考试已结束，无法参加" }, { status: 403 });
    }
  }

  const questions = bank.questions.map(item => item.question);
  if (questions.length === 0) {
    return NextResponse.json({ error: "题库题目不足，无法开始考试" }, { status: 422 });
  }

  const examSession = await prisma.examSession.create({
    data: {
      userId: session.user.id,
      bankId,
      durationSecs: effectiveDuration,
      answers: {
        create: questions.map((q) => ({ questionId: q.id, userAnswer: null })),
      },
    },
  });

  return NextResponse.json({ sessionId: examSession.id, questions });
}
