import { NextRequest, NextResponse } from "next/server";
import { getServerSession, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { QuestionType } from "@prisma/client";

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
  const errors: { index: number; reason: string }[] = [];

  for (let i = 0; i < body.length; i++) {
    const item = body[i] as Record<string, unknown>;
    const { type, content, category } = item ?? {};

    if (!type || !content || !category) {
      skipped++;
      errors.push({ index: i, reason: "缺少必填字段 type/content/category" });
      continue;
    }

    if (!["MCQ", "TFQ", "CODING"].includes(type as string)) {
      skipped++;
      errors.push({ index: i, reason: "无效的题目类型" });
      continue;
    }

    const qType = type as QuestionType;

    if (qType === "MCQ") {
      const { optionA, optionB, optionC, optionD, correctAnswer } = item;
      if (!optionA || !optionB || !optionC || !optionD || !correctAnswer) {
        skipped++;
        errors.push({ index: i, reason: "MCQ 缺少选项或正确答案" });
        continue;
      }
      await prisma.question.create({
        data: {
          type: qType,
          content: content as string,
          category: category as string,
          optionA: optionA as string,
          optionB: optionB as string,
          optionC: optionC as string,
          optionD: optionD as string,
          correctAnswer: correctAnswer as string,
        },
      });
    } else if (qType === "TFQ") {
      const { correctAnswer } = item;
      if (!correctAnswer || !["true", "false"].includes(correctAnswer as string)) {
        skipped++;
        errors.push({ index: i, reason: "TFQ 正确答案必须为 'true' 或 'false'" });
        continue;
      }
      await prisma.question.create({
        data: {
          type: qType,
          content: content as string,
          category: category as string,
          correctAnswer: correctAnswer as string,
        },
      });
    } else if (qType === "CODING") {
      const { description, correctAnswer, scoringCriteria } = item;
      if (!description || !correctAnswer || !scoringCriteria) {
        skipped++;
        errors.push({ index: i, reason: "CODING 缺少 description/correctAnswer/scoringCriteria" });
        continue;
      }
      await prisma.question.create({
        data: {
          type: qType,
          content: content as string,
          category: category as string,
          description: description as string,
          correctAnswer: correctAnswer as string,
          scoringCriteria: scoringCriteria as string,
        },
      });
    }

    success++;
  }

  return NextResponse.json({ success, skipped, errors });
}
