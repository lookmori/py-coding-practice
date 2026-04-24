"use client";

import { useRef, useState } from "react";

type ImportType = "TEACHER" | "STUDENT";

interface SchoolGroup {
  schoolName: string;
  schoolCode: string;
  created: { displayName: string; username: string }[];
}

interface ImportResult {
  success: number;
  created: { displayName: string; username: string }[];
  errors: { row: number; reason: string }[];
  schoolGroups?: SchoolGroup[];
}

// 示例 CSV 内容
const TEACHER_SAMPLE = `# 每个学校块以「学校名称,学校编码」开头
测试学校01,XS01
张老师
李老师
王老师,mypassword
# 可以包含多所学校
测试学校02,XS02
赵老师
钱老师`;

const STUDENT_SAMPLE = `# 格式：显示名称,老师账号[,初始密码]
张三,XS01LS01
李四,XS01LS01
王五,XS01LS02,mypassword
赵六,XS02LS01`;

function downloadSample(type: ImportType) {
  const content = type === "TEACHER" ? TEACHER_SAMPLE : STUDENT_SAMPLE;
  const filename = type === "TEACHER" ? "批量导入老师示例.csv" : "批量导入学生示例.csv";
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface Props {
  onSuccess: () => void;
}

export default function BulkImportPanel({ onSuccess }: Props) {
  const [importType, setImportType] = useState<ImportType>("TEACHER");
  const [csvText, setCsvText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleImport() {
    if (!csvText.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/users/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: importType, csv: csvText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ success: 0, created: [], errors: [{ row: 0, reason: data.error ?? "导入失败" }] });
      } else {
        setResult(data);
        if (data.success > 0) onSuccess();
      }
    } finally {
      setLoading(false);
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setCsvText((ev.target?.result as string) ?? "");
    reader.readAsText(file, "utf-8");
    if (fileRef.current) fileRef.current.value = "";
  }

  // 过滤掉空行、注释行（# 开头）、以及疑似学校块头行（恰好2个逗号分隔字段且第2个字段是4位字母数字）
  const lineCount = csvText.split("\n").filter(l => {
    const trimmed = l.trim();
    if (!trimmed) return false;
    if (trimmed.startsWith("#")) return false;
    const parts = trimmed.split(",");
    if (parts.length === 2 && /^[A-Za-z0-9]{4}$/.test(parts[1].trim())) return false;
    return true;
  }).length;

  return (
    <div className="space-y-4">
      {/* 类型选择 + 下载示例 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          {(["TEACHER", "STUDENT"] as ImportType[]).map(t => (
            <button
              key={t}
              onClick={() => { setImportType(t); setCsvText(""); setResult(null); }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                importType === t
                  ? "border-[#58a6ff] bg-[#388bfd]/20 text-[#58a6ff]"
                  : "border-th-border bg-th-bg text-th-text2 hover:bg-th-hover"
              }`}
            >
              {t === "TEACHER" ? "批量导入老师" : "批量导入学生"}
            </button>
          ))}
        </div>
        <button
          onClick={() => downloadSample(importType)}
          className="flex items-center gap-1.5 rounded-lg border border-th-border bg-th-bg px-3 py-1.5 text-xs font-medium text-th-text2 hover:bg-th-hover transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          下载示例文件
        </button>
      </div>

      {/* 格式说明 */}
      <div className="rounded-lg border border-th-border bg-th-bg2 px-4 py-3 text-xs text-th-text2 space-y-1">
        <p className="font-medium text-th-text">CSV 格式说明：</p>
        {importType === "TEACHER" ? (
          <>
            <p>第 1 行：<span className="font-mono text-[#58a6ff]">学校名称,学校编码</span>（学校不存在时自动创建）</p>
            <p>第 2 行起：<span className="font-mono text-[#58a6ff]">显示名称[,初始密码]</span></p>
            <p className="text-th-muted">账号自动生成为 <span className="font-mono">{"{"} 学校编码 {"}"}LS{"{"} 序号 {"}"}</span>，如 <span className="font-mono">XS01LS01</span>，密码不填默认 123456</p>
            <p className="text-th-muted">支持多学校块，每个学校块以学校信息行开头</p>
          </>
        ) : (
          <>
            <p>每行格式：<span className="font-mono text-[#58a6ff]">显示名称,老师账号[,初始密码]</span></p>
            <p className="text-th-muted">账号自动生成为 <span className="font-mono">{"{"} 学校编码 {"}"}{"{"} 序号 {"}"}</span>，如 <span className="font-mono">XS010001</span>，学校由老师账号自动推断</p>
            <p className="text-th-muted">老师账号需已存在，密码不填默认 123456</p>
          </>
        )}
        <p className="text-th-muted">以 # 开头的行为注释，会被忽略</p>
      </div>

      {/* 文本输入区 */}
      <div className="relative">
        <textarea
          value={csvText}
          onChange={e => setCsvText(e.target.value)}
          rows={8}
          placeholder={importType === "TEACHER" ? TEACHER_SAMPLE : STUDENT_SAMPLE}
          className="w-full rounded-lg border border-th-border bg-th-bg px-4 py-3 text-sm font-mono text-th-text placeholder-th-muted focus:border-[#58a6ff] focus:outline-none resize-none"
        />
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <span className="text-xs text-th-muted">
            {lineCount > 0 ? `${lineCount} 条数据` : ""}
          </span>
          <label className="cursor-pointer flex items-center gap-1 rounded border border-th-border bg-th-bg2 px-2 py-1 text-xs text-th-text2 hover:bg-th-hover transition-colors">
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
            </svg>
            上传文件
            <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
          </label>
        </div>
      </div>

      {/* 导入按钮 */}
      <div className="flex justify-end">
        <button
          onClick={handleImport}
          disabled={loading || !csvText.trim()}
          className="rounded-lg bg-[#238636] px-5 py-2 text-sm font-semibold text-white hover:bg-[#2ea043] disabled:opacity-50 transition-colors"
        >
          {loading ? "导入中..." : "开始导入"}
        </button>
      </div>

      {/* 导入结果 */}
      {result && (
        <div className={`rounded-lg border p-4 space-y-3 ${result.errors.length > 0 && result.success === 0 ? "border-[#f85149]/30 bg-[#f85149]/10" : "border-[#3fb950]/30 bg-[#3fb950]/10"}`}>
          <p className="text-sm font-semibold text-th-text">
            导入完成：成功 <span className="text-[#3fb950]">{result.success}</span> 条
            {result.errors.length > 0 && <span className="text-[#f85149] ml-2">，失败 {result.errors.length} 条</span>}
          </p>

          {/* 按学校分组渲染 */}
          {result.schoolGroups && result.schoolGroups.length > 0 ? (
            <div className="space-y-3">
              {result.schoolGroups.map((group, gi) => (
                <div key={gi} className="rounded-lg border border-th-border overflow-hidden">
                  <div className="bg-th-bg2 px-3 py-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-th-text">
                      {group.schoolName}
                      <span className="ml-2 font-mono text-th-text2">{group.schoolCode}</span>
                    </span>
                    <span className="text-xs text-[#3fb950]">成功创建 {group.created.length} 人</span>
                  </div>
                  {group.created.length > 0 && (
                    <table className="w-full text-xs">
                      <thead className="bg-th-bg2 border-t border-th-border">
                        <tr>
                          <th className="px-3 py-2 text-left text-th-text2 font-medium">显示名称</th>
                          <th className="px-3 py-2 text-left text-th-text2 font-medium">账号</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-th-border">
                        {group.created.map((u, i) => (
                          <tr key={i} className="hover:bg-th-hover">
                            <td className="px-3 py-2 text-th-text">{u.displayName}</td>
                            <td className="px-3 py-2 font-mono text-th-text2">{u.username}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ))}
            </div>
          ) : result.created.length > 0 ? (
            /* 向后兼容：无 schoolGroups 时平铺渲染 */
            <div className="overflow-x-auto rounded-lg border border-th-border">
              <table className="w-full text-xs">
                <thead className="bg-th-bg2">
                  <tr>
                    <th className="px-3 py-2 text-left text-th-text2 font-medium">显示名称</th>
                    <th className="px-3 py-2 text-left text-th-text2 font-medium">账号</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-th-border">
                  {result.created.map((u, i) => (
                    <tr key={i} className="hover:bg-th-hover">
                      <td className="px-3 py-2 text-th-text">{u.displayName}</td>
                      <td className="px-3 py-2 font-mono text-th-text2">{u.username}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {result.errors.length > 0 && (
            <div className="space-y-1 max-h-32 overflow-auto">
              {result.errors.map((e, i) => (
                <p key={i} className="text-xs text-[#f85149]">
                  {e.row > 0 ? `第 ${e.row} 行：` : ""}{e.reason}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
