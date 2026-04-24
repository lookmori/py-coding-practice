"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";

const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

// Markdown 工具栏按钮
const TOOLBAR = [
  { label: "B", title: "粗体", wrap: ["**", "**"], icon: <span className="font-bold">B</span> },
  { label: "I", title: "斜体", wrap: ["*", "*"], icon: <span className="italic">I</span> },
  { label: "H", title: "标题", wrap: ["## ", ""], icon: <span className="font-mono text-xs">H2</span> },
  { label: "`", title: "行内代码", wrap: ["`", "`"], icon: <span className="font-mono text-xs">`c`</span> },
  { label: "```", title: "代码块", wrap: ["```\n", "\n```"], icon: <span className="font-mono text-xs">{"<>"}</span> },
  { label: "-", title: "列表", wrap: ["- ", ""], icon: <span className="font-mono text-xs">≡</span> },
];

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export default function MarkdownEditor({ value, onChange, placeholder = "输入评语，支持 Markdown 格式（可选）...", minHeight = 120 }: Props) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [useMonaco, setUseMonaco] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // 工具栏插入
  function insertWrap(before: string, after: string) {
    const ta = document.getElementById("md-editor-textarea") as HTMLTextAreaElement | null;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end);
    const newVal = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(newVal);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 0);
  }

  return (
    <div className="rounded-lg border border-th-border overflow-hidden">
      {/* 工具栏 */}
      <div className="flex items-center justify-between bg-th-bg2 border-b border-th-border px-2 py-1.5">
        {/* 格式按钮 */}
        <div className="flex items-center gap-0.5">
          {mode === "edit" && TOOLBAR.map(btn => (
            <button
              key={btn.label}
              type="button"
              title={btn.title}
              onClick={() => insertWrap(btn.wrap[0], btn.wrap[1])}
              className="flex items-center justify-center w-7 h-7 rounded text-th-text2 hover:bg-th-hover hover:text-th-text transition-colors text-xs"
            >
              {btn.icon}
            </button>
          ))}
          {mode === "edit" && (
            <div className="w-px h-4 bg-th-border mx-1" />
          )}
          {/* Monaco 切换 */}
          {mode === "edit" && (
            <button
              type="button"
              title={useMonaco ? "切换为简单编辑器" : "切换为代码编辑器"}
              onClick={() => setUseMonaco(v => !v)}
              className={`flex items-center gap-1 px-2 h-7 rounded text-xs transition-colors ${useMonaco ? "bg-[#388bfd]/15 text-[#58a6ff]" : "text-th-muted hover:bg-th-hover hover:text-th-text"}`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              {useMonaco ? "代码模式" : "代码模式"}
            </button>
          )}
        </div>
        {/* 编辑/预览切换 */}
        <div className="flex gap-1 text-xs">
          <button
            type="button"
            onClick={() => setMode("edit")}
            className={`px-2.5 py-1 rounded transition-colors ${mode === "edit" ? "bg-th-hover text-th-text font-medium" : "text-th-muted hover:text-th-text2"}`}
          >
            编辑
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={`px-2.5 py-1 rounded transition-colors ${mode === "preview" ? "bg-th-hover text-th-text font-medium" : "text-th-muted hover:text-th-text2"}`}
          >
            预览
          </button>
        </div>
      </div>

      {/* 编辑区 */}
      {mode === "edit" ? (
        useMonaco ? (
          <div style={{ height: minHeight + 40 }}>
            <MonacoEditor
              height={minHeight + 40}
              language="markdown"
              theme={isDark ? "vs-dark" : "light"}
              value={value}
              onChange={v => onChange(v ?? "")}
              options={{
                minimap: { enabled: false },
                lineNumbers: "off",
                wordWrap: "on",
                fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, monospace",
                scrollBeyondLastLine: false,
                padding: { top: 10, bottom: 10 },
                renderLineHighlight: "none",
                overviewRulerLanes: 0,
                hideCursorInOverviewRuler: true,
                scrollbar: { vertical: "hidden", horizontal: "hidden" },
                suggest: { showWords: false },
              }}
            />
          </div>
        ) : (
          <textarea
            id="md-editor-textarea"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            style={{ minHeight }}
            className="w-full bg-th-bg px-4 py-3 text-sm text-th-text placeholder-th-muted font-mono leading-relaxed resize-y focus:outline-none"
          />
        )
      ) : (
        <div
          className="px-4 py-3 text-sm text-th-text prose prose-sm max-w-none bg-th-bg"
          style={{ minHeight }}
        >
          {value ? (
            <ReactMarkdown
              components={{
                code: ({ children, className }) => {
                  const isBlock = className?.includes("language-");
                  return isBlock ? (
                    <pre className="bg-th-bg2 border border-th-border rounded-lg p-3 overflow-x-auto">
                      <code className="font-mono text-xs text-[#3fb950]">{children}</code>
                    </pre>
                  ) : (
                    <code className="bg-th-bg2 border border-th-border rounded px-1.5 py-0.5 font-mono text-xs text-[#58a6ff]">{children}</code>
                  );
                },
              }}
            >
              {value}
            </ReactMarkdown>
          ) : (
            <span className="text-th-muted italic">（无评语）</span>
          )}
        </div>
      )}

      {/* 底部字数 */}
      <div className="flex items-center justify-between bg-th-bg2 border-t border-th-border px-3 py-1">
        <span className="text-xs text-th-muted">Markdown 格式</span>
        <span className="text-xs text-th-muted">{value.length} 字符</span>
      </div>
    </div>
  );
}
