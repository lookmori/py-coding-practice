"use client";

import { useState, useRef, useEffect } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function Select({
  value,
  onChange,
  options,
  placeholder = "请选择",
  disabled = false,
  className = "",
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(v => !v)}
        className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors text-left
          ${disabled
            ? "border-th-border bg-th-bg opacity-50 cursor-not-allowed text-th-muted"
            : open
              ? "border-[#58a6ff] bg-th-bg text-th-text"
              : "border-th-border bg-th-bg text-th-text hover:border-[#58a6ff]/50"
          }`}
      >
        <span className={selected ? "text-th-text" : "text-th-muted"}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-th-muted transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-th-border bg-th-card shadow-lg overflow-hidden">
          <div className="max-h-52 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); }}
              className={`w-full px-3 py-2 text-sm text-left transition-colors
                ${!value ? "bg-[#388bfd]/15 text-[#58a6ff]" : "text-th-muted hover:bg-th-hover hover:text-th-text"}`}
            >
              {placeholder}
            </button>
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full px-3 py-2 text-sm text-left transition-colors flex items-center justify-between
                  ${value === opt.value
                    ? "bg-[#388bfd]/15 text-[#58a6ff]"
                    : "text-th-text hover:bg-th-hover"
                  }`}
              >
                <span>{opt.label}</span>
                {value === opt.value && (
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
