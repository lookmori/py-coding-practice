"use client";

import { useEffect, useReducer, useRef, useCallback, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import type { Question } from "@prisma/client";
import Timer from "@/components/Timer";
import QuestionCard from "@/components/QuestionCard";
import ProgressBar from "@/components/ProgressBar";
import ScreenSwitchWarning from "@/components/ScreenSwitchWarning";

interface ExamState {
  currentIndex: number;
  answers: Record<string, string>;
  switchCount: number;
  warningVisible: boolean;
  questions: Question[];
  loading: boolean;
  error: string | null;
  durationSecs: number;
}

type ExamAction =
  | { type: "LOAD_SUCCESS"; questions: Question[]; answers: Record<string, string>; switchCount: number; durationSecs: number }
  | { type: "LOAD_ERROR"; error: string }
  | { type: "SET_ANSWER"; questionId: string; value: string }
  | { type: "GO_TO"; index: number }
  | { type: "NEXT" }
  | { type: "PREV" }
  | { type: "SWITCH_DETECTED"; switchCount: number }
  | { type: "HIDE_WARNING" };

function reducer(state: ExamState, action: ExamAction): ExamState {
  switch (action.type) {
    case "LOAD_SUCCESS":
      return { ...state, loading: false, questions: action.questions, answers: action.answers, switchCount: action.switchCount, durationSecs: action.durationSecs };
    case "LOAD_ERROR":
      return { ...state, loading: false, error: action.error };
    case "SET_ANSWER":
      return { ...state, answers: { ...state.answers, [action.questionId]: action.value } };
    case "GO_TO":
      return { ...state, currentIndex: Math.max(0, Math.min(action.index, state.questions.length - 1)) };
    case "NEXT":
      return { ...state, currentIndex: Math.min(state.currentIndex + 1, state.questions.length - 1) };
    case "PREV":
      return { ...state, currentIndex: Math.max(state.currentIndex - 1, 0) };
    case "SWITCH_DETECTED":
      return { ...state, switchCount: action.switchCount, warningVisible: true };
    case "HIDE_WARNING":
      return { ...state, warningVisible: false };
    default:
      return state;
  }
}

const initialState: ExamState = {
  currentIndex: 0,
  answers: {},
  switchCount: 0,
  warningVisible: false,
  questions: [],
  loading: true,
  error: null,
  durationSecs: 5400,
};

// 题目类型分组标签
const TYPE_LABELS: Record<string, string> = { MCQ: "选择题", TFQ: "判断题", CODING: "编程题" };

export default function ExamSessionPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [state, dispatch] = useReducer(reducer, initialState);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showUnanswered, setShowUnanswered] = useState(false); // 漏题提示弹窗
  const submittingRef = useRef(false);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 加载考试数据
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/exam/${sessionId}`);
        if (!res.ok) { dispatch({ type: "LOAD_ERROR", error: "加载考试数据失败" }); return; }
        const data = await res.json();
        if (data.submitted) { router.replace(`/exam/${sessionId}/result`); return; }
        dispatch({ type: "LOAD_SUCCESS", questions: data.questions, answers: data.answers ?? {}, switchCount: data.switchCount, durationSecs: data.durationSecs });
      } catch {
        dispatch({ type: "LOAD_ERROR", error: "网络错误，请刷新重试" });
      }
    }
    load();
  }, [sessionId, router]);

  // 离开页面拦截：提示用户离开会自动提交
  useEffect(() => {
    if (state.loading) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "离开页面将自动提交试卷，确定要离开吗？";
      return e.returnValue;
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [state.loading]);

  // 统一提交：先 autosave 所有答案，再 submit
  const handleSubmit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      // 1. 先把所有答案批量保存
      const answersPayload = state.questions.map((q) => ({
        questionId: q.id,
        userAnswer: state.answers[q.id] ?? null,
      }));
      await fetch(`/api/exam/${sessionId}/autosave`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answersPayload }),
      });
      // 2. 提交
      const res = await fetch(`/api/exam/${sessionId}/submit`, { method: "POST" });
      if (res.status === 409 || res.ok) {
        router.replace(`/exam/${sessionId}/result`);
      }
    } catch {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [sessionId, router, state.questions, state.answers]);

  const handleAutoSubmit = useCallback(() => { handleSubmit(); }, [handleSubmit]);

  // 屏幕切换检测
  useEffect(() => {
    if (state.loading) return;
    async function recordSwitch() {
      try {
        const res = await fetch(`/api/exam/${sessionId}/switch`, { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          dispatch({ type: "SWITCH_DETECTED", switchCount: data.switchCount });
          if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
          warningTimerRef.current = setTimeout(() => dispatch({ type: "HIDE_WARNING" }), 3000);
        }
      } catch { /* silent */ }
    }
    const onVisibilityChange = () => { if (document.visibilityState === "hidden") recordSwitch(); };
    const onBlur = () => recordSwitch();
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
    };
  }, [sessionId, state.loading]);

  // 每 30 秒自动保存
  useEffect(() => {
    if (state.loading || state.questions.length === 0) return;
    const id = setInterval(async () => {
      const answersPayload = state.questions.map((q) => ({ questionId: q.id, userAnswer: state.answers[q.id] ?? null }));
      try {
        await fetch(`/api/exam/${sessionId}/autosave`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: answersPayload }) });
      } catch { /* silent */ }
    }, 30000);
    return () => clearInterval(id);
  }, [sessionId, state.loading, state.questions, state.answers]);

  useEffect(() => () => { if (warningTimerRef.current) clearTimeout(warningTimerRef.current); }, []);

  // 统计各类型题目
  const mcqQuestions = state.questions.filter(q => q.type === "MCQ");
  const tfqQuestions = state.questions.filter(q => q.type === "TFQ");
  const codingQuestions = state.questions.filter(q => q.type === "CODING");
  const answeredCount = Object.values(state.answers).filter(v => v && v.trim() !== "").length;
  const unansweredCount = state.questions.length - answeredCount;

  // 获取所有未作答题目的索引
  const unansweredIndices = state.questions
    .map((q, i) => ({ q, i }))
    .filter(({ q }) => !state.answers[q.id]?.trim())
    .map(({ i }) => i);

  // 点击交卷：先检查漏题
  function handleManualSubmit() {
    if (unansweredCount > 0) {
      setShowUnanswered(true); // 显示漏题弹窗
    } else {
      setShowConfirm(true); // 全部完成，显示确认弹窗
    }
  }

  if (state.loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-th-bg">
        <svg className="h-10 w-10 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <p className="text-th-text2">正在加载考题...</p>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{state.error}</p>
          <button onClick={() => window.location.reload()} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">刷新重试</button>
        </div>
      </div>
    );
  }

  const currentQuestion = state.questions[state.currentIndex];
  const currentAnswer = currentQuestion ? (state.answers[currentQuestion.id] ?? null) : null;

  return (
    <div className="min-h-screen bg-th-bg">
      <ScreenSwitchWarning count={state.switchCount} threshold={3} visible={state.warningVisible} />

      {/* 交卷 loading 遮罩 */}
      {submitting && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
          <svg className="h-12 w-12 animate-spin text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="mt-4 text-lg font-medium text-white">正在提交答卷，请稍候...</p>
        </div>
      )}

      {/* 漏题提示弹窗 */}
      {showUnanswered && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl bg-[#161b22] border border-[#30363d] p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e3b341]/20">
                <svg className="h-5 w-5 text-[#e3b341]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-[#e6edf3]">还有题目未作答</h3>
                <p className="text-xs text-[#8b949e] font-mono mt-0.5">必须完成所有题目才能提交</p>
              </div>
            </div>
            <div className="rounded-lg bg-[#0d1117] border border-[#30363d] p-3 mb-4">
              <p className="text-xs text-[#8b949e] mb-2 font-mono">未作答题目：</p>
              <div className="flex flex-wrap gap-1.5">
                {unansweredIndices.map(i => (
                  <button key={i}
                    onClick={() => { setShowUnanswered(false); dispatch({ type: "GO_TO", index: i }); }}
                    className="h-7 w-7 rounded bg-[#e3b341]/20 text-xs font-mono font-bold text-[#e3b341] hover:bg-[#e3b341]/30 transition-colors">
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowUnanswered(false); dispatch({ type: "GO_TO", index: unansweredIndices[0] }); }}
                className="flex-1 rounded-lg bg-[#e3b341] py-2 text-sm font-semibold text-black hover:bg-[#d4a017] transition-colors">
                去补答第 {unansweredIndices[0] + 1} 题
              </button>
              <button onClick={() => setShowUnanswered(false)}
                className="rounded-lg border border-[#30363d] px-4 py-2 text-sm text-[#8b949e] hover:bg-[#21262d] transition-colors">
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 交卷确认弹窗（只有全部完成才会显示） */}
      {showConfirm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl bg-[#161b22] border border-[#30363d] p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#3fb950]/20">
                <svg className="h-5 w-5 text-[#3fb950]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-[#e6edf3]">确认交卷？</h3>
                <p className="text-xs text-[#8b949e] font-mono mt-0.5">提交后无法修改答案</p>
              </div>
            </div>
            <div className="rounded-lg bg-[#0d1117] border border-[#30363d] p-3 mb-4 font-mono text-xs">
              <div className="flex justify-between text-[#8b949e] mb-1">
                <span>已作答</span>
                <span className="text-[#3fb950] font-bold">{answeredCount} / {state.questions.length}</span>
              </div>
              <div className="h-1.5 rounded-full bg-[#21262d] overflow-hidden">
                <div className="h-full rounded-full bg-[#3fb950] transition-all"
                  style={{ width: `${(answeredCount / state.questions.length) * 100}%` }} />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-lg border border-[#30363d] py-2 text-sm text-[#8b949e] hover:bg-[#21262d] transition-colors">
                继续答题
              </button>
              <button onClick={() => { setShowConfirm(false); handleSubmit(); }}
                className="flex-1 rounded-lg bg-[#da3633] py-2 text-sm font-semibold text-white hover:bg-[#f85149] transition-colors">
                确认交卷
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 顶部导航栏 */}
      <div className="sticky top-0 z-10 border-b border-th-border bg-th-bg2 px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="text-sm font-semibold text-th-text">在线考试</span>
          <div className="flex items-center gap-4">
            <span className="text-xs text-th-text2">{answeredCount}/{state.questions.length} 已作答</span>
            <div className="flex items-center gap-1.5 text-sm text-th-text2">
              <svg className="h-4 w-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <Timer durationSeconds={state.durationSecs} onExpire={handleAutoSubmit} />
            </div>
            <button
              onClick={handleManualSubmit}
              disabled={submitting}
              className="rounded-lg bg-red-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              交卷
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex gap-6">
          {/* 左侧：题目内容 */}
          <div className="flex-1 min-w-0 space-y-4">
            <ProgressBar current={state.currentIndex + 1} total={state.questions.length} />

            {currentQuestion && (
              <QuestionCard
                question={currentQuestion}
                answer={currentAnswer}
                onAnswer={(value) => dispatch({ type: "SET_ANSWER", questionId: currentQuestion.id, value })}
                questionNumber={state.currentIndex + 1}
              />
            )}

            {/* 上一题/下一题 */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => dispatch({ type: "PREV" })}
                disabled={state.currentIndex === 0}
                className="flex items-center gap-1 rounded-lg border border-th-border bg-th-bg2 px-4 py-2 text-sm font-medium text-th-text transition-colors hover:bg-th-bg disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← 上一题
              </button>
              <button
                onClick={() => dispatch({ type: "NEXT" })}
                disabled={state.currentIndex === state.questions.length - 1}
                className="flex items-center gap-1 rounded-lg border border-th-border bg-th-bg2 px-4 py-2 text-sm font-medium text-th-text transition-colors hover:bg-th-bg disabled:cursor-not-allowed disabled:opacity-40"
              >
                下一题 →
              </button>
            </div>
          </div>

          {/* 右侧：答题卡 */}
          <div className="hidden w-56 shrink-0 lg:block">
            <div className="sticky top-20 rounded-xl border border-th-border bg-th-bg2 p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-th-text">答题卡</h3>

              {[
                { label: TYPE_LABELS.MCQ, questions: mcqQuestions, offset: 0 },
                { label: TYPE_LABELS.TFQ, questions: tfqQuestions, offset: mcqQuestions.length },
                { label: TYPE_LABELS.CODING, questions: codingQuestions, offset: mcqQuestions.length + tfqQuestions.length },
              ].map(({ label, questions, offset }) => (
                <div key={label} className="mb-4">
                  <p className="mb-2 text-xs font-medium text-th-text2">{label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {questions.map((q, i) => {
                      const globalIndex = offset + i;
                      const answered = !!(state.answers[q.id]?.trim());
                      const isCurrent = globalIndex === state.currentIndex;
                      return (
                        <button
                          key={q.id}
                          onClick={() => dispatch({ type: "GO_TO", index: globalIndex })}
                          className={`h-7 w-7 rounded text-xs font-medium transition-all ${
                            isCurrent
                              ? "bg-blue-600 text-white ring-2 ring-blue-300"
                              : answered
                              ? "bg-green-500 text-white"
                              : "bg-gray-100 text-th-text2 hover:bg-th-hover"
                          }`}
                        >
                          {globalIndex + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* 图例 */}
              <div className="mt-3 space-y-1 border-t border-th-border pt-3">
                {[
                  { color: "bg-blue-600", label: "当前题" },
                  { color: "bg-green-500", label: "已作答" },
                  { color: "bg-gray-100", label: "未作答" },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-2 text-xs text-th-text2">
                    <span className={`h-3 w-3 rounded ${color}`} />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
