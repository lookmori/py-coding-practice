"use client";

import dynamic from "next/dynamic";
import type { Question } from "@prisma/client";
import MarkdownContent from "./MarkdownContent";
import { isImageUrl } from "@/lib/imageUtils";
import QuestionImage from "./QuestionImage";

// Monaco Editor 懒加载，避免 SSR 问题
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center rounded-md border border-th-border bg-th-bg">
      <div className="flex items-center gap-2 text-sm text-th-muted">
        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        编辑器加载中...
      </div>
    </div>
  ),
});

interface QuestionCardProps {
  question: Question;
  answer: string | null;
  onAnswer: (value: string) => void;
  questionNumber: number;
}

const OPTIONS = ["A", "B", "C", "D"] as const;

export default function QuestionCard({
  question,
  answer,
  onAnswer,
  questionNumber,
}: QuestionCardProps) {
  const optionText: Record<string, string | null | undefined> = {
    A: question.optionA,
    B: question.optionB,
    C: question.optionC,
    D: question.optionD,
  };

  const typeLabel: Record<string, string> = {
    MCQ: "单选题",
    TFQ: "判断题",
    CODING: "编程题",
  };

  return (
    <div className="rounded-lg border border-th-border bg-th-bg2 shadow-sm overflow-hidden">
      {/* 题目头部 */}
      <div className="flex items-center gap-3 border-b border-th-border bg-th-bg px-6 py-3">
        <span className="text-sm text-th-text2">第 {questionNumber} 题</span>
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
          {typeLabel[question.type] ?? question.type}
        </span>
        {question.category && (
          <span className="rounded-full bg-th-hover px-2 py-0.5 text-xs text-th-text2">
            {question.category}
          </span>
        )}
      </div>

      <div className="p-6">
        {/* 题干 - 支持 Markdown 渲染 */}
        <div className="mb-6">
          <MarkdownContent content={question.content} />
        </div>

        {/* MCQ 单选题 */}
        {question.type === "MCQ" && (
          <div className="space-y-3">
            {OPTIONS.map((key) => {
              const text = optionText[key];
              if (text == null) return null;
              const selected = answer === key;
              return (
                <button
                  key={key}
                  onClick={() => onAnswer(key)}
                  className={`flex w-full items-start gap-3 rounded-lg border-2 px-4 py-3 text-left text-sm transition-all ${
                    selected
                      ? "border-blue-500 bg-blue-50 text-blue-800 shadow-sm"
                      : "border-th-border bg-th-bg2 text-th-text hover:border-th-border hover:bg-th-bg"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
                      selected
                        ? "border-blue-500 bg-blue-500 text-white"
                        : "border-th-border text-th-muted"
                    }`}
                  >
                    {key}
                  </span>
                  <span className="flex-1">
                    {isImageUrl(text)
                      ? <QuestionImage src={text} alt={`选项 ${key}`} className="max-h-40" />
                      : text
                    }
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* TFQ 判断题 */}
        {question.type === "TFQ" && (
          <div className="flex gap-4">
            {[
              { value: "true", label: "✓ 正确", color: "green" },
              { value: "false", label: "✗ 错误", color: "red" },
            ].map(({ value, label, color }) => {
              const selected = answer === value;
              const colorMap = {
                green: selected
                  ? "border-green-500 bg-green-50 text-green-700"
                  : "border-th-border bg-th-bg2 text-th-text hover:border-green-300 hover:bg-green-50",
                red: selected
                  ? "border-red-500 bg-red-50 text-red-700"
                  : "border-th-border bg-th-bg2 text-th-text hover:border-red-300 hover:bg-red-50",
              };
              return (
                <button
                  key={value}
                  onClick={() => onAnswer(value)}
                  className={`flex-1 rounded-lg border-2 px-4 py-4 text-base font-semibold transition-all ${colorMap[color as keyof typeof colorMap]}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* CODING 编程题 */}
        {question.type === "CODING" && (
          <div className="space-y-4">
            {question.description && (
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
                <MarkdownContent content={question.description} className="text-blue-800" />
              </div>
            )}
            <div className="overflow-hidden rounded-lg border border-th-border shadow-sm">
              {/* 编辑器标题栏 */}
              <div className="flex items-center gap-2 border-b border-th-border bg-gray-800 px-4 py-2">
                <div className="flex gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-red-500" />
                  <span className="h-3 w-3 rounded-full bg-yellow-500" />
                  <span className="h-3 w-3 rounded-full bg-green-500" />
                </div>
                <span className="ml-2 text-xs text-th-muted">solution.py</span>
              </div>
              <MonacoEditor
                height="320px"
                language="python"
                theme="vs-dark"
                value={answer ?? ""}
                onChange={(val) => onAnswer(val ?? "")}
                options={{
                  fontSize: 14,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                  lineNumbers: "on",
                  renderLineHighlight: "line",
                  tabSize: 4,
                  insertSpaces: true,
                  automaticLayout: true,
                  padding: { top: 12, bottom: 12 },
                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
                  fontLigatures: true,
                  cursorBlinking: "smooth",
                  smoothScrolling: true,
                  contextmenu: false,
                }}
              />
            </div>
            <p className="text-xs text-th-muted">
              支持 Python 语法高亮 · Tab 键缩进 · 答案将在交卷时统一提交
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
