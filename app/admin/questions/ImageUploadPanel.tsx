"use client";

import { useRef, useState } from "react";

type FileStatus = "pending" | "uploading" | "success" | "error";
type BankType = "EXAM" | "PRACTICE";

interface FileItem {
  file: File;
  status: FileStatus;
  url?: string;
  error?: string;
}

interface Props {
  defaultBankType?: BankType;
}

const BANK_TYPE_FOLDER: Record<BankType, string> = {
  EXAM: "exam",
  PRACTICE: "practice",
};

export default function ImageUploadPanel({ defaultBankType }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [bankType, setBankType] = useState<BankType>(defaultBankType ?? "EXAM");
  const [subFolder, setSubFolder] = useState("");
  const [fileItems, setFileItems] = useState<FileItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const effectiveFolder = `${BANK_TYPE_FOLDER[bankType]}/${subFolder.trim() || today}`;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setFileItems(files.map((file) => ({ file, status: "pending" })));
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleUpload() {
    if (fileItems.length === 0 || uploading) return;
    setUploading(true);
    setFileItems((prev) => prev.map((item) => ({ ...item, status: "uploading" })));

    const formData = new FormData();
    formData.append("folder", effectiveFolder);
    fileItems.forEach((item) => formData.append("files", item.file));

    try {
      const res = await fetch("/api/admin/images/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setFileItems((prev) =>
          prev.map((item) => ({ ...item, status: "error", error: data.error ?? "上传失败" }))
        );
        return;
      }

      const resultMap = new Map<string, { url?: string; error?: string }>(
        (data.results ?? []).map((r: { filename: string; url?: string; error?: string }) => [r.filename, r])
      );

      setFileItems((prev) =>
        prev.map((item) => {
          const result = resultMap.get(item.file.name);
          if (!result) return { ...item, status: "error", error: "未收到上传结果" };
          if (result.url) return { ...item, status: "success", url: result.url };
          return { ...item, status: "error", error: result.error ?? "上传失败" };
        })
      );
    } catch {
      setFileItems((prev) =>
        prev.map((item) => ({ ...item, status: "error", error: "网络错误" }))
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleCopy(url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  }

  const statusIcon: Record<FileStatus, string> = {
    pending: "⏳",
    uploading: "⏫",
    success: "✓",
    error: "✗",
  };

  const statusColor: Record<FileStatus, string> = {
    pending: "text-th-muted",
    uploading: "text-blue-500",
    success: "text-green-600",
    error: "text-red-500",
  };

  return (
    <div className="space-y-4">
      {/* 类型选择 + 子文件夹 */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-th-text2 mb-1">图片用途</label>
          <div className="flex rounded-lg overflow-hidden border border-th-border">
            {(["EXAM", "PRACTICE"] as BankType[]).map((t) => (
              <button
                key={t}
                onClick={() => setBankType(t)}
                className={`px-4 py-1.5 text-xs font-medium transition-colors ${
                  bankType === t
                    ? t === "EXAM"
                      ? "bg-[#f78166]/20 text-[#f78166]"
                      : "bg-[#388bfd]/20 text-[#58a6ff]"
                    : "bg-th-bg2 text-th-text2 hover:bg-th-hover"
                }`}
              >
                {t === "EXAM" ? "考试" : "练习"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-40">
          <label className="block text-xs text-th-text2 mb-1">
            子文件夹名称
            <span className="ml-1 text-th-muted">（留空使用今日日期）</span>
          </label>
          <input
            value={subFolder}
            onChange={(e) => setSubFolder(e.target.value)}
            placeholder={today}
            className="w-full rounded-lg border border-th-border bg-th-bg px-3 py-1.5 text-sm font-mono text-th-text placeholder-th-muted focus:border-[#58a6ff] focus:outline-none"
          />
        </div>

        <div className="text-xs text-th-muted font-mono bg-th-bg2 border border-th-border rounded-lg px-3 py-1.5 whitespace-nowrap">
          📁 {effectiveFolder}/
        </div>
      </div>

      {/* 文件选择 */}
      <div>
        <label className="block text-xs text-th-text2 mb-1">选择图片文件</label>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-th-border bg-th-bg px-4 py-2 text-sm text-th-text2 hover:bg-th-hover transition-colors">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
          </svg>
          选择图片（支持多选）
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
        <p className="mt-1 text-xs text-th-muted">支持 JPEG、PNG、GIF、WebP，单文件 ≤ 10MB</p>
      </div>

      {/* 已选文件列表 */}
      {fileItems.length > 0 && (
        <div className="rounded-lg border border-th-border bg-th-bg2 divide-y divide-th-border overflow-hidden">
          {fileItems.map((item, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className={`shrink-0 font-medium ${statusColor[item.status]}`}>
                {statusIcon[item.status]}
              </span>
              <span className="flex-1 truncate font-mono text-xs text-th-text2">
                {item.file.name}
              </span>
              {item.status === "success" && item.url && (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="truncate max-w-xs font-mono text-xs text-[#58a6ff]">
                    {item.url}
                  </span>
                  <button
                    onClick={() => handleCopy(item.url!)}
                    className="shrink-0 rounded border border-th-border bg-th-bg px-2 py-0.5 text-xs text-th-text2 hover:bg-th-hover transition-colors"
                  >
                    {copied === item.url ? "已复制" : "复制"}
                  </button>
                </div>
              )}
              {item.status === "error" && (
                <span className="text-xs text-red-500">{item.error}</span>
              )}
              {item.status === "uploading" && (
                <svg className="h-3.5 w-3.5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 上传按钮 */}
      <div className="flex justify-end">
        <button
          onClick={handleUpload}
          disabled={uploading || fileItems.length === 0}
          className="rounded-lg bg-[#238636] px-5 py-2 text-sm font-semibold text-white hover:bg-[#2ea043] disabled:opacity-50 transition-colors"
        >
          {uploading ? "上传中..." : `上传${fileItems.length > 0 ? ` (${fileItems.length} 个文件)` : ""}`}
        </button>
      </div>
    </div>
  );
}
