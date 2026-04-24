import { NextRequest, NextResponse } from "next/server";
import { getServerSession, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { QuestionType, UserRole } from "@prisma/client";

export async function POST(req: NextRequest, { params }: { params: { bankId: string } }) {
  const session = await getServerSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ADMIN 全权访问；TEACHER 只能操作自己学校的题库
  if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.TEACHER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const bank = await prisma.questionBank.findUnique({ where: { id: params.bankId } });
  if (!bank) return NextResponse.json({ error: "Bank not found" }, { status: 404 });

  // 老师只能操作本校题库（PUBLIC 题库 schoolId 可能为 null，老师不能操作）
  if (session.user.role === UserRole.TEACHER) {
    if (!bank.schoolId || bank.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  let body: unknown;
  try { body = await req.json(); } catch (e) {
    console.error("[import] JSON parse error:", e);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!Array.isArray(body)) {
    console.error("[import] body is not array, type:", typeof body, "value:", JSON.stringify(body)?.slice(0, 200));
    return NextResponse.json({ error: "格式错误：请求体必须是 JSON 数组，请下载示例文件参考格式" }, { status: 400 });
  }

  let success = 0, skipped = 0;
  const errors: { index: number; reason: string }[] = [];

  // 获取当前最大 order
  const maxItem = await prisma.questionBankItem.findFirst({
    where: { bankId: params.bankId },
    orderBy: { order: "desc" },
  });
  let order = (maxItem?.order ?? -1) + 1;

  for (let i = 0; i < body.length; i++) {
    const rawItem = body[i] as Record<string, unknown>;
    // 过滤掉以 _ 开头的说明字段
    const item: Record<string, unknown> = {};
    for (const key of Object.keys(rawItem)) {
      if (!key.startsWith("_")) item[key] = rawItem[key];
    }
    const { type, content, category } = item;

    if (!type || !content || !category) {
      skipped++; errors.push({ index: i, reason: "缺少必填字段 type/content/category" }); continue;
    }
    if (!["MCQ", "TFQ", "CODING"].includes(type as string)) {
      skipped++; errors.push({ index: i, reason: "无效题目类型" }); continue;
    }

    const qType = type as QuestionType;

    // 练习题库只允许导入编程题
    if (bank.type === "PRACTICE" && qType !== "CODING") {
      skipped++; errors.push({ index: i, reason: "练习题库只支持编程题（CODING），MCQ/TFQ 已跳过" }); continue;
    }

    if (qType === "MCQ") {
      const { optionA, optionB, optionC, optionD, correctAnswer } = item;
      if (!optionA || !optionB || !optionC || !optionD || !correctAnswer) {
        skipped++; errors.push({ index: i, reason: "MCQ 缺少选项或正确答案" }); continue;
      }
      const q = await prisma.question.create({
        data: { type: qType, content: content as string, category: category as string, optionA: optionA as string, optionB: optionB as string, optionC: optionC as string, optionD: optionD as string, correctAnswer: correctAnswer as string },
      });
      await prisma.questionBankItem.create({ data: { bankId: params.bankId, questionId: q.id, order: order++ } });
    } else if (qType === "TFQ") {
      const { correctAnswer } = item;
      if (!correctAnswer || !["true", "false"].includes(correctAnswer as string)) {
        skipped++; errors.push({ index: i, reason: "TFQ 正确答案必须为 'true' 或 'false'" }); continue;
      }
      const q = await prisma.question.create({
        data: { type: qType, content: content as string, category: category as string, correctAnswer: correctAnswer as string },
      });
      await prisma.questionBankItem.create({ data: { bankId: params.bankId, questionId: q.id, order: order++ } });
    } else if (qType === "CODING") {
      const { description, correctAnswer, scoringCriteria } = item;
      if (!description || !correctAnswer || !scoringCriteria) {
        skipped++; errors.push({ index: i, reason: "CODING 缺少 description/correctAnswer/scoringCriteria" }); continue;
      }
      const q = await prisma.question.create({
        data: { type: qType, content: content as string, category: category as string, description: description as string, correctAnswer: correctAnswer as string, scoringCriteria: scoringCriteria as string },
      });
      await prisma.questionBankItem.create({ data: { bankId: params.bankId, questionId: q.id, order: order++ } });
    }
    success++;
  }

  return NextResponse.json({ success, skipped, errors });
}
