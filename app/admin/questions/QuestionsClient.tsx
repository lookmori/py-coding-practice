"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { truncateContent } from "@/lib/utils";
import ConfirmDialog from "@/components/ConfirmDialog";
import ImageUploadPanel from "./ImageUploadPanel";

type Question = {
  id: string;
  type: string;
  category: string;
  content: string;
};

type ImportResult = { success: number; skipped: number; errors: { index: number; reason: string }[] };

function QuestionImportButton({ onResult }: { onResult: (r: ImportResult) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await fetch("/api/admin/questions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      const data = await res.json();
      onResult(data);
    } catch {
      onResult({ success: 0, skipped: 0, errors: [{ index: -1, reason: "文件解析失败或请求错误" }] });
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors">
      {loading ? "导入中..." : "批量导入题目 (JSON)"}
      <input ref={inputRef} type="file" accept=".json" className="hidden" onChange={handleFile} disabled={loading} />
    </label>
  );
}

function DeleteQuestionButton({ questionId }: { questionId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleConfirm() {
    setOpen(false);
    setLoading(true);
    try {
      await fetch(`/api/admin/questions/${questionId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <ConfirmDialog
        open={open}
        title="删除题目"
        description="确认删除该题目？此操作不可撤销，相关答题记录中的引用将保留。"
        confirmText="确认删除"
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
      <button
        onClick={() => setOpen(true)}
        disabled={loading}
        className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
      >
        {loading ? "删除中..." : "删除"}
      </button>
    </>
  );
}

const typeLabel: Record<string, string> = { MCQ: "单选题", TFQ: "判断题", CODING: "编程题" };

export default function QuestionsClient({ questions }: { questions: Question[] }) {
  const router = useRouter();
  const [result, setResult] = useState<ImportResult | null>(null);
  const [imagesPanelOpen, setImagesPanelOpen] = useState(false);

  function handleResult(r: ImportResult) {
    setResult(r);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <QuestionImportButton onResult={handleResult} />
        <button
          onClick={() => setImagesPanelOpen((v) => !v)}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-th-bg2 border border-th-border text-th-text2 text-sm rounded hover:bg-th-hover transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          图片管理
          <svg
            className={`h-3.5 w-3.5 transition-transform ${imagesPanelOpen ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {imagesPanelOpen && (
        <div className="rounded-lg border border-th-border bg-th-card p-4">
          <h3 className="text-sm font-medium text-th-text mb-3">图片管理</h3>
          <ImageUploadPanel />
        </div>
      )}


      {result && (
        <div className="bg-th-bg2 border border-th-border rounded p-3 text-sm">
          <p className="font-medium text-th-text mb-1">
            导入结果：成功 {result.success} 条，跳过 {result.skipped} 条
          </p>
          {result.errors.length > 0 && (
            <ul className="text-[#f85149] space-y-0.5 max-h-32 overflow-auto">
              {result.errors.map((e, i) => (
                <li key={i}>第 {e.index + 1} 条：{e.reason}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="overflow-x-auto bg-th-card rounded-lg border border-th-border">
        <table className="min-w-full text-sm">
          <thead className="bg-th-bg2 border-b border-th-border">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-th-text2">类型</th>
              <th className="px-4 py-3 text-left font-medium text-th-text2">分类</th>
              <th className="px-4 py-3 text-left font-medium text-th-text2">题目内容</th>
              <th className="px-4 py-3 text-left font-medium text-th-text2">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-th-border">
            {questions.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-th-muted">暂无题目</td>
              </tr>
            )}
            {questions.map((q) => (
              <tr key={q.id} className="hover:bg-th-hover transition-colors">
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-[#388bfd]/15 text-[#58a6ff]">
                    {typeLabel[q.type] ?? q.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-th-text2">{q.category}</td>
                <td className="px-4 py-3 text-th-text">{truncateContent(q.content, 50)}</td>
                <td className="px-4 py-3">
                  <DeleteQuestionButton questionId={q.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
