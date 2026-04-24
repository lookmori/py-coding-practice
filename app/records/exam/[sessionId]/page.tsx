import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import MarkdownContent from "@/components/MarkdownContent";

interface Props {
  params: { sessionId: string };
}

export default async function ExamRecordDetailPage({ params }: Props) {
  const session = await getServerSession();
  if (!session?.user?.id) redirect("/login");

  const examSession = await prisma.examSession.findUnique({
    where: { id: params.sessionId },
    include: {
      answers: {
        include: {
          question: {
            select: {
              type: true,
              content: true,
              correctAnswer: true,
              optionA: true,
              optionB: true,
              optionC: true,
              optionD: true,
            },
          },
        },
        orderBy: { savedAt: "asc" },
      },
    },
  });

  if (!examSession) notFound();
  if (examSession.userId !== session.user.id) redirect("/403");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">考试详情</h1>
      <p className="mb-6 text-sm text-gray-500">
        {examSession.startedAt.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" })}
      </p>

      <div className="space-y-4">
        {examSession.answers.map((answer, idx) => {
          const q = answer.question;
          const isObjective = q.type === "MCQ" || q.type === "TFQ";
          const isCoding = q.type === "CODING";

          return (
            <div key={answer.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              {/* 题目头部 */}
              <div className="mb-3 flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  q.type === "MCQ" ? "bg-blue-50 text-blue-600"
                  : q.type === "TFQ" ? "bg-green-50 text-green-600"
                  : "bg-purple-50 text-purple-600"
                }`}>
                  {q.type === "MCQ" ? "单选" : q.type === "TFQ" ? "判断" : "编程"}
                </span>
                <span className="text-sm font-medium text-gray-800">第 {idx + 1} 题</span>
                {isObjective && (
                  <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${
                    answer.isCorrect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                  }`}>
                    {answer.isCorrect ? "✓ 答对" : "✗ 答错"}
                  </span>
                )}
                {isCoding && (
                  <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${
                    answer.isCorrect === true ? "bg-green-100 text-green-700"
                    : answer.isCorrect === false ? "bg-red-100 text-red-600"
                    : "bg-gray-100 text-gray-500"
                  }`}>
                    {answer.isCorrect === true ? "✓ 正确" : answer.isCorrect === false ? "✗ 错误" : "待评分"}
                  </span>
                )}
              </div>

              <p className="mb-3 text-sm text-gray-700">{q.content}</p>

              {/* 答案区域 */}
              {isObjective ? (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-xs text-gray-400 mb-1">你的答案</p>
                    <p className="font-medium text-gray-800">{answer.userAnswer ?? "未作答"}</p>
                  </div>
                  <div className="rounded-lg bg-green-50 px-3 py-2">
                    <p className="text-xs text-gray-400 mb-1">正确答案</p>
                    <p className="font-medium text-green-700">{q.correctAnswer}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">你的代码：</p>
                  <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs text-green-300 font-mono leading-relaxed">
                    {answer.userAnswer ?? "（未作答）"}
                  </pre>
                </div>
              )}

              {/* 管理员评语 */}
              {answer.comment && (
                <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
                  <p className="mb-1.5 text-xs font-semibold text-blue-600">📝 教师评语</p>
                  <div className="text-sm text-blue-900 prose prose-sm max-w-none prose-blue">
                    <MarkdownContent content={answer.comment} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8">
        <Link href="/records/exam" className="text-sm text-blue-600 hover:underline">
          ← 返回考试记录列表
        </Link>
      </div>
    </div>
  );
}
