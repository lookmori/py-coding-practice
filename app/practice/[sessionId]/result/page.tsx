import { notFound, redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDuration } from "@/lib/utils";
import LeaderboardPoller from "./LeaderboardPoller";

interface Props {
  params: { sessionId: string };
}

export default async function PracticeResultPage({ params }: Props) {
  const authSession = await getServerSession();
  if (!authSession?.user?.id) {
    redirect("/login");
  }

  const practiceSession = await prisma.practiceSession.findUnique({
    where: { id: params.sessionId },
    include: {
      answers: {
        include: {
          question: {
            select: {
              content: true,
              type: true,
            },
          },
        },
      },
    },
  });

  if (!practiceSession) notFound();
  if (practiceSession.userId !== authSession.user.id) redirect("/403");

  const totalQuestions = practiceSession.answers.length;
  const skippedCount = practiceSession.answers.filter((a) => a.isSkipped).length;
  const durationSecs = practiceSession.durationSecs ?? 0;

  // Fetch leaderboard for initial render
  const leaderboardSessions = await prisma.practiceSession.findMany({
    where: { completedAt: { not: null } },
    orderBy: { durationSecs: "asc" },
    select: {
      id: true,
      participantName: true,
      durationSecs: true,
      correctCount: true,
    },
  });

  const leaderboardEntries = leaderboardSessions.map((s, index) => ({
    rank: index + 1,
    sessionId: s.id,
    participantName: s.participantName,
    durationSecs: s.durationSecs,
    correctCount: s.correctCount,
  }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">练习结果</h1>

      {/* Summary */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">成绩概览</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-md bg-orange-50 p-4 text-center col-span-2 sm:col-span-1">
            <p className="text-2xl font-bold text-orange-600">待批改</p>
            <p className="mt-1 text-xs text-orange-500">编程题需教师批改</p>
          </div>
          <div className="rounded-md bg-gray-50 p-4 text-center">
            <p className="text-2xl font-bold text-gray-700">{totalQuestions}</p>
            <p className="mt-1 text-xs text-gray-500">总题数</p>
          </div>
          <div className="rounded-md bg-yellow-50 p-4 text-center">
            <p className="text-2xl font-bold text-yellow-700">{skippedCount}</p>
            <p className="mt-1 text-xs text-yellow-600">跳过题数</p>
          </div>
          <div className="rounded-md bg-blue-50 p-4 text-center">
            <p className="text-2xl font-bold text-blue-700 font-mono">
              {formatDuration(durationSecs)}
            </p>
            <p className="mt-1 text-xs text-blue-600">完成时间</p>
          </div>
        </div>
      </div>

      {/* Per-question breakdown */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">逐题详情</h2>
        <div className="space-y-3">
          {practiceSession.answers.map((answer, index) => {
            const isSkipped = answer.isSkipped;

            return (
              <div
                key={answer.id}
                className={`rounded-md border border-gray-100 p-4 ${isSkipped ? "bg-yellow-50" : "bg-white"}`}
              >
                <p className="mb-2 text-xs text-gray-500">第 {index + 1} 题</p>
                <p className="mb-3 text-sm font-medium text-gray-900">
                  {answer.question.content}
                </p>

                {/* 答案展示 */}
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-1">你的答案：</p>
                  {isSkipped ? (
                    <span className="text-sm text-gray-400 italic">（已跳过）</span>
                  ) : answer.userAnswer ? (
                    <pre className="rounded bg-gray-50 border border-gray-200 px-3 py-2 text-sm font-mono text-gray-800 whitespace-pre-wrap break-words">
                      {answer.userAnswer}
                    </pre>
                  ) : (
                    <span className="text-sm text-gray-400 italic">（未作答）</span>
                  )}
                </div>

                {/* 状态徽章 */}
                <div className="flex flex-wrap gap-2">
                  {isSkipped ? (
                    <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                      已跳过
                    </span>
                  ) : (
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                      待批改
                    </span>
                  )}
                </div>

                {/* 教师评语 */}
                {answer.comment && (
                  <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
                    <p className="mb-1.5 text-xs font-semibold text-blue-600">📝 教师评语</p>
                    <p className="text-sm text-blue-900 whitespace-pre-wrap">{answer.comment}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Leaderboard with polling */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">排行榜</h2>
        <LeaderboardPoller
          highlightSessionId={params.sessionId}
          initialEntries={leaderboardEntries}
        />
      </div>

      <div>
        <a
          href="/practice"
          className="inline-block rounded-md bg-green-600 px-6 py-2 text-sm font-semibold text-white hover:bg-green-700"
        >
          再次练习
        </a>
      </div>
    </div>
  );
}
