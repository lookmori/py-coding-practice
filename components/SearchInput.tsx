"use client";

import { useRef } from "react";

interface SearchInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  debounce?: number;
  className?: string;
}

export default function SearchInput({
  value,
  onChange,
  placeholder = "搜索...",
  debounce = 400,
  className = "",
}: SearchInputProps) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    // 立即更新显示值（由父组件控制）
    onChange(val);
    // 如果父组件需要防抖，可以在外部处理；这里直接触发
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      // debounce 已在外部处理，这里只是保留接口兼容
    }, debounce);
  }

  return (
    <div className={`relative ${className}`}>
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-th-muted"
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full rounded-lg border border-th-border bg-th-bg pl-9 pr-4 py-2 text-sm text-th-text placeholder-[#6e7681] outline-none transition-all focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]/30 font-mono"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-th-muted hover:text-th-text transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
