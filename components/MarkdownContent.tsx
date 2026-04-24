"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { Components } from "react-markdown";
import { preprocessBareImageUrls } from "@/lib/imageUtils";
import QuestionImage from "./QuestionImage";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export default function MarkdownContent({ content, className = "" }: MarkdownContentProps) {
  const components: Components = {
    // 代码块（```python ... ```）
    code({ className: cls, children, ...props }) {
      const match = /language-(\w+)/.exec(cls ?? "");
      const isBlock = !!match;
      const codeStr = String(children).replace(/\n$/, "");

      if (isBlock) {
        const lang = match![1];
        return (
          <div className="my-3 overflow-hidden rounded-lg border border-gray-700 shadow-sm">
            {/* 标题栏 */}
            <div className="flex items-center gap-2 border-b border-gray-700 bg-gray-800 px-4 py-2">
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-red-500" />
                <span className="h-3 w-3 rounded-full bg-yellow-500" />
                <span className="h-3 w-3 rounded-full bg-green-500" />
              </div>
              <span className="ml-1 text-xs text-gray-400">{lang}</span>
            </div>
            <SyntaxHighlighter
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              style={vscDarkPlus as any}
              language={lang}
              PreTag="div"
              customStyle={{
                margin: 0,
                borderRadius: 0,
                fontSize: "13px",
                padding: "16px",
                background: "#1e1e1e",
              }}
              {...props}
            >
              {codeStr}
            </SyntaxHighlighter>
          </div>
        );
      }

      // 行内代码 `code`
      return (
        <code
          className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-sm text-pink-600"
          {...props}
        >
          {children}
        </code>
      );
    },

    // 段落
    p({ children }) {
      return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>;
    },

    // 列表
    ul({ children }) {
      return <ul className="mb-2 list-disc pl-5 space-y-1">{children}</ul>;
    },
    ol({ children }) {
      return <ol className="mb-2 list-decimal pl-5 space-y-1">{children}</ol>;
    },
    li({ children }) {
      return <li className="text-sm">{children}</li>;
    },

    // 加粗 / 斜体
    strong({ children }) {
      return <strong className="font-semibold text-gray-900">{children}</strong>;
    },
    em({ children }) {
      return <em className="italic text-gray-700">{children}</em>;
    },

    // 图片渲染（支持裸 URL 预处理后的图片）
    img({ src, alt }) {
      if (!src) return null;
      return <QuestionImage src={src} alt={alt ?? "image"} className="my-2" />;
    },
  };

  return (
    <div className={`text-sm text-gray-900 ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {preprocessBareImageUrls(content)}
      </ReactMarkdown>
    </div>
  );
}
