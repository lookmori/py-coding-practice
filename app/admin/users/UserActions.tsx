"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";

type ImportResult = { success: number; skipped: number; errors: { index: number; reason: string }[] };

function FileImportButton({
  label,
  method,
  url,
  onResult,
}: {
  label: string;
  method: "POST" | "PUT";
  url: string;
  onResult: (r: ImportResult) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await fetch(url, {
        method,
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
      {loading ? "处理中..." : label}
      <input ref={inputRef} type="file" accept=".json" className="hidden" onChange={handleFile} disabled={loading} />
    </label>
  );
}

export function UserImportActions({ onRefresh }: { onRefresh: () => void }) {
  const [result, setResult] = useState<ImportResult | null>(null);
  const [mode, setMode] = useState<"import" | "update" | null>(null);

  function handleResult(r: ImportResult, m: "import" | "update") {
    setResult(r);
    setMode(m);
    onRefresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <FileImportButton
          label="批量导入用户 (JSON)"
          method="POST"
          url="/api/admin/users/import"
          onResult={(r) => handleResult(r, "import")}
        />
        <FileImportButton
          label="批量修改用户 (JSON)"
          method="PUT"
          url="/api/admin/users/bulk-update"
          onResult={(r) => handleResult(r, "update")}
        />
      </div>

      {result && (
        <div className="bg-gray-50 border rounded p-3 text-sm">
          <p className="font-medium text-gray-700 mb-1">
            {mode === "import" ? "导入" : "修改"}结果：成功 {result.success} 条，跳过 {result.skipped} 条
          </p>
          {result.errors.length > 0 && (
            <ul className="text-red-600 space-y-0.5 max-h-32 overflow-auto">
              {result.errors.map((e, i) => (
                <li key={i}>
                  第 {e.index + 1} 条：{e.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function DeleteUserButton({ userId, displayName }: { userId: string; displayName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleConfirm() {
    setOpen(false);
    setLoading(true);
    try {
      await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <ConfirmDialog
        open={open}
        title={`删除用户「${displayName}」`}
        description="此操作不可撤销，用户的考试和练习记录将被软删除。"
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
