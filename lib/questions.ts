import { Question, QuestionType } from "@prisma/client";
import prisma from "./prisma";

/**
 * 获取题库中所有题目（供练习模式 fallback 使用）
 * 按 MCQ → TFQ → CODING 顺序排序
 */
export async function getAllPracticeQuestions(): Promise<Question[]> {
  const typeOrder: Record<QuestionType, number> = {
    MCQ: 0,
    TFQ: 1,
    CODING: 2,
  };

  const questions = await prisma.question.findMany({
    orderBy: { type: "asc" },
  });

  // Prisma 按字母序排序（CODING < MCQ < TFQ），手动按业务顺序重排
  return questions.sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);
}
