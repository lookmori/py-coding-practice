"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import type { Question } from "@prisma/client";
import QuestionCard from "@/components/QuestionCard";
import ProgressBar from "@/components/ProgressBar";
import { formatDuration } from "@/lib/utils";
import MarkdownContent from "@/components/MarkdownContent";

interface LeaderboardEntry {
  rank: number;
  sessionId: string;
  participantName: string;
  durationSecs: number | null;
  correctCount: number | null;
}

// 实时排行榜侧边栏（SSE 实时推送，无感刷新）
function LiveLeaderboard({ bankId, currentSessionId }: { bankId: string | null; currentSessionId: string }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [newEntry, setNewEntry] = useState<string | null>(null); // 新上榜提示

  useEffect(() => {
    if (!bankId) return;

    const es = new EventSource(`/api/leaderboard/stream?bankId=${bankId}`);

    es.onopen = () => setConnected(true);

    es.onmessage = (e) => {
      try {
        const next: LeaderboardEntry[] = JSON.parse(e.data);
        setEntries(prev => {
          // 检测是否有新完成的人
          const prevIds = new Set(prev.map(p => p.sessionId));
          const newcomer = next.find(n => !prevIds.has(n.sessionId) && n.sessionId !== currentSessionId);
          if (newcomer && prev.length > 0) {
            setNewEntry(newcomer.participantName);
            setTimeout(() => setNewEntry(null), 3000);
          }
          return next;
        });
      } catch { /* ignore */ }
    };

    es.onerror = () => setConnected(false);

    return () => es.close();
  }, [bankId, currentSessionId]);

  return (
    <div className="hidden lg:block w-64 shrink-0">
      <div className="sticky top-20 rounded-xl border border-th-border bg-th-bg2 shadow-sm overflow-hidden">
        {/* 标题 */}
        <div className="flex items-center justify-between border-b border-th-border bg-gradient-to-r from-orange-50 to-yellow-50 px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className="text-base">🏆</span>
            <span className="text-sm font-bold text-gray-800">实时排行榜</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full transition-colors ${connected ? "bg-green-400 animate-pulse" : "bg-gray-300"}`} />
            <span className="text-xs text-th-muted">{connected ? "实时" : "连接中"}</span>
          </div>
        </div>

        {/* 新上榜提示 */}
        {newEntry && (
          <div className="bg-yellow-50 border-b border-yellow-100 px-3 py-2 text-xs text-yellow-700 font-medium animate-in slide-in-from-top duration-300">
            🎉 {newEntry} 刚刚完成！
          </div>
        )}

        {/* 排行列表 */}
        <div className="divide-y divide-gray-50">
          {entries.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-th-muted">
              <p className="text-2xl mb-1">🎯</p>
              <p>暂无完成记录</p>
              <p className="mt-1 text-blue-500 font-medium">成为第一名！</p>
            </div>
          ) : (
            entries.map((entry) => {
              const isMe = entry.sessionId === currentSessionId;
              const rankEmoji = entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : null;
              return (
                <div key={entry.sessionId}
                  className={`flex items-center gap-2 px-3 py-2.5 transition-colors ${isMe ? "bg-blue-50 border-l-2 border-blue-500" : "hover:bg-th-bg"}`}>
                  <div className="w-6 shrink-0 text-center">
                    {rankEmoji
                      ? <span className="text-base">{rankEmoji}</span>
                      : <span className="text-xs font-bold text-th-muted">{entry.rank}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate ${isMe ? "text-blue-700" : "text-gray-800"}`}>
                      {entry.participantName}
                      {isMe && <span className="ml-1 text-blue-400">（我）</span>}
                    </p>
                    <p className="text-xs text-th-muted">答对 {entry.correctCount ?? 0} 题</p>
                  </div>
                  <div className="shrink-0">
                    <span className={`text-xs font-mono font-semibold ${entry.rank === 1 ? "text-yellow-600" : "text-th-text2"}`}>
                      {entry.durationSecs != null ? formatDuration(entry.durationSecs) : "—"}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-th-border bg-th-bg px-4 py-2 text-center">
          <p className="text-xs text-th-muted">实时更新 · 完成即上榜</p>
        </div>
      </div>
    </div>
  );
}

export default function PracticeSessionPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [correctMap, setCorrectMap] = useState<Record<string, boolean | null>>({});
  const [commentMap, setCommentMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readonly, setReadonly] = useState(false);
  const [bankId, setBankId] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ durationSecs: number | null; correctCount: number | null; completedAt: string | null } | null>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/practice/${sessionId}`);
        if (!res.ok) {
          setError(res.status === 404 ? "练习记录不存在" : res.status === 403 ? "无权访问此练习" : "加载练习数据失败");
          return;
        }
        const data = await res.json();
        setQuestions(data.questions ?? []);
        setAnswers(data.answers ?? {});
        setSkippedIds(new Set(data.skippedIds ?? []));
        setBankId(data.bankId ?? null);

        if (data.readonly) {
          setReadonly(true);
          setCorrectMap(data.correctMap ?? {});
          setCommentMap(data.commentMap ?? {});
          setSummary({ durationSecs: data.durationSecs, correctCount: data.correctCount, completedAt: data.completedAt });
        }
      } catch {
        setError("网络错误，请刷新重试");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId, router]);

  const isLastQuestion = currentIndex === questions.length - 1;

  const goTo = useCallback((index: number) => {
    setTransitioning(true);
    setTimeout(() => {
      setCurrentIndex(Math.max(0, Math.min(index, questions.length - 1)));
      setTransitioning(false);
    }, 150);
  }, [questions.length]);

  const handleSubmit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const payload = questions.map((q) => ({
        questionId: q.id,
        isSkipped: skippedIds.has(q.id),
        userAnswer: skippedIds.has(q.id) ? null : (answers[q.id] ?? null),
      }));
      const batchRes = await fetch(`/api/practice/${sessionId}/answers-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload }),
      });
      if (!batchRes.ok) { submittingRef.current = false; setSubmitting(false); return; }
      const res = await fetch(`/api/practice/${sessionId}/submit`, { method: "POST" });
      if (res.status === 409 || res.ok) {
        router.replace(`/practice/${sessionId}/result`);
      }
    } catch {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [sessionId, router, questions, answers, skippedIds]);

  const handleSkip = useCallback(() => {
    const question = questions[currentIndex];
    if (!question) return;
    setSkippedIds((prev) => new Set(prev).add(question.id));
    if (isLastQuestion) handleSubmit();
    else goTo(currentIndex + 1);
  }, [questions, currentIndex, isLastQuestion, goTo, handleSubmit]);

  const handleAnswer = useCallback((value: string) => {
    const question = questions[currentIndex];
    if (!question) return;
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
  }, [questions, currentIndex]);

  const handleConfirmAnswer = useCallback(() => {
    if (isLastQuestion) handleSubmit();
    else goTo(currentIndex + 1);
  }, [isLastQuestion, currentIndex, goTo, handleSubmit]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-th-bg">
        <svg className="h-10 w-10 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <p className="text-th-text2">正在加载题目...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">刷新重试</button>
        </div>
      </div>
    );
  }

  if (submitting) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
        <svg className="h-12 w-12 animate-spin text-white" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <p className="mt-4 text-lg font-medium text-white">正在提交练习，请稍候...</p>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? (answers[currentQuestion.id] ?? null) : null;
  const answeredCount = Object.keys(answers).filter(id => answers[id]?.trim() && !skippedIds.has(id)).length;

  // ── 只读查看模式 ──────────────────────────────────────────────────────
  if (readonly) {
    return (
      <div className="min-h-screen bg-th-bg">
        <div className="sticky top-0 z-10 border-b border-th-border bg-th-bg2 px-4 py-3 shadow-sm">
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">✓ 已完成</span>
              <span className="text-sm font-semibold text-th-text">练习回顾</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-th-text2">
              {summary?.correctCount != null && (
                <span>答对 <span className="font-semibold text-green-600">{summary.correctCount}</span> / {questions.length}</span>
              )}
              {summary?.durationSecs != null && (
                <span>用时 <span className="font-semibold text-blue-600">{formatDuration(summary.durationSecs)}</span></span>
              )}
              <button onClick={() => router.push("/practice")} className="rounded-lg border border-th-border bg-th-bg2 px-3 py-1 text-xs text-th-text2 hover:bg-th-bg">
                返回练习列表
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-4 py-6 flex gap-6">
          <div className="flex-1 min-w-0 space-y-4">
            <ProgressBar current={currentIndex + 1} total={questions.length} />
            <div className={`transition-opacity duration-150 ${transitioning ? "opacity-0" : "opacity-100"}`}>
              {currentQuestion && (() => {
                const isSkipped = skippedIds.has(currentQuestion.id);
                const isCorrect = correctMap[currentQuestion.id];
                const userAnswer = answers[currentQuestion.id] ?? null;
                const comment = commentMap[currentQuestion.id];
                return (
                  <div className="space-y-3">
                    <div className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium ${
                      isSkipped ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                      : isCorrect === true ? "bg-green-50 text-green-700 border border-green-200"
                      : isCorrect === false ? "bg-red-50 text-red-700 border border-red-200"
                      : "bg-th-bg text-th-text2 border border-th-border"
                    }`}>
                      {isSkipped ? "⏭ 已跳过" : isCorrect === true ? "✓ 回答正确" : isCorrect === false ? "✗ 回答错误" : "— 待批改"}
                      {!isSkipped && userAnswer && <span className="ml-auto text-xs opacity-70">你的答案：{userAnswer}</span>}
                    </div>
                    <div className="pointer-events-none opacity-90">
                      <QuestionCard question={currentQuestion} answer={userAnswer} onAnswer={() => {}} questionNumber={currentIndex + 1} />
                    </div>
                    {/* 教师评语 */}
                    {comment && (
                      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
                        <p className="mb-1.5 text-xs font-semibold text-blue-600">📝 教师评语</p>
                        <div className="text-sm text-blue-900 prose prose-sm max-w-none">
                          <MarkdownContent content={comment} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            <div className="flex items-center justify-between">
              <button onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0}
                className="rounded-lg border border-th-border bg-th-bg2 px-4 py-2 text-sm font-medium text-th-text hover:bg-th-bg disabled:opacity-40">← 上一题</button>
              <button onClick={() => goTo(currentIndex + 1)} disabled={currentIndex === questions.length - 1}
                className="rounded-lg border border-th-border bg-th-bg2 px-4 py-2 text-sm font-medium text-th-text hover:bg-th-bg disabled:opacity-40">下一题 →</button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-2">
              {questions.map((q, i) => {
                const isSkipped = skippedIds.has(q.id);
                const isCorrect = correctMap[q.id];
                const isCurrent = i === currentIndex;
                return (
                  <button key={q.id} onClick={() => goTo(i)}
                    className={`h-7 w-7 rounded text-xs font-medium transition-all ${isCurrent ? "ring-2 ring-offset-1 ring-blue-400 " : ""}${
                      isSkipped ? "bg-yellow-400 text-white" : isCorrect === true ? "bg-green-500 text-white" : isCorrect === false ? "bg-red-400 text-white" : "bg-gray-200 text-th-text2"
                    }`}>
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
          <LiveLeaderboard bankId={bankId} currentSessionId={sessionId} />
        </div>
      </div>
    );
  }

  // ── 答题模式 ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-th-bg">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 border-b border-th-border bg-th-bg2 px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="text-sm font-semibold text-th-text">练习模式</span>
          <span className="text-xs text-th-text2">
            已答 {answeredCount} · 跳过 {skippedIds.size} · 共 {questions.length} 题
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6 flex gap-6">
        {/* 左侧：题目区域 */}
        <div className="flex-1 min-w-0 space-y-6">
          <ProgressBar current={currentIndex + 1} total={questions.length} skipped={skippedIds.size} />

          <div className={`transition-opacity duration-150 ${transitioning ? "opacity-0" : "opacity-100"}`}>
            {currentQuestion && (
              <QuestionCard question={currentQuestion} answer={currentAnswer} onAnswer={handleAnswer} questionNumber={currentIndex + 1} />
            )}
          </div>

          <div className="flex items-center justify-between gap-4">
            <button onClick={handleSkip} disabled={submitting}
              className="rounded-lg border-2 border-yellow-400 bg-yellow-50 px-5 py-2.5 text-sm font-medium text-yellow-700 transition-colors hover:bg-yellow-100 disabled:opacity-60">
              跳过此题
            </button>
            <button onClick={handleConfirmAnswer} disabled={submitting || currentAnswer === null}
              className="rounded-lg bg-blue-600 px-8 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50">
              {isLastQuestion ? "完成练习" : "下一题 →"}
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-2">
            {questions.map((q, i) => {
              const isSkipped = skippedIds.has(q.id);
              const isAnswered = !isSkipped && !!answers[q.id]?.trim();
              const isCurrent = i === currentIndex;
              return (
                <button key={q.id} onClick={() => goTo(i)}
                  className={`h-7 w-7 rounded text-xs font-medium transition-all ${
                    isCurrent ? "bg-blue-600 text-white ring-2 ring-blue-300"
                    : isSkipped ? "bg-yellow-400 text-white"
                    : isAnswered ? "bg-green-500 text-white"
                    : "bg-gray-100 text-th-text2 hover:bg-th-hover"
                  }`}>
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="flex gap-4 text-xs text-th-muted">
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-blue-600" />当前</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-green-500" />已答</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-yellow-400" />跳过</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-gray-100 border border-th-border" />未答</span>
          </div>
        </div>

        {/* 右侧：实时排行榜 */}
        <LiveLeaderboard bankId={bankId} currentSessionId={sessionId} />
      </div>
    </div>
  );
}
