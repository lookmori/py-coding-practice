"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { signOut, useSession } from "next-auth/react";

const navItems = [
  { href: "/teacher/students", label: "学生管理", icon: "👥" },
  { href: "/teacher/questions", label: "题库管理", icon: "📝" },
  { href: "/teacher/records/exam", label: "考试记录", icon: "⏱" },
  { href: "/teacher/records/practice", label: "练习记录", icon: "🚀" },
  { href: "/teacher/grading", label: "编程题评分", icon: "🎯" },
];

export default function TeacherSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { data: session } = useSession();
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 bg-th-bg2 border border-th-border rounded p-2 shadow text-th-text"
        onClick={() => setOpen(v => !v)}
        aria-label="切换侧边栏"
      >
        <span className="block w-5 h-0.5 bg-th-text2 mb-1" />
        <span className="block w-5 h-0.5 bg-th-text2 mb-1" />
        <span className="block w-5 h-0.5 bg-th-text2" />
      </button>

      {open && (
        <div className="md:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} />
      )}

      <aside
        className={`
          fixed md:static top-0 left-0 h-full z-50 w-56 bg-th-bg2 border-r border-th-border flex flex-col
          transition-transform duration-200
          ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <div className="p-5 border-b border-th-border flex items-center justify-between">
          <Link href="/teacher" className="font-bold text-th-text font-mono text-sm">
            <span className="text-[#3fb950]">teacher</span>
            <span className="text-[#58a6ff]">-panel</span>
          </Link>
          {mounted && (
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="flex items-center justify-center w-7 h-7 rounded-md border border-th-border bg-th-bg text-th-text2 hover:text-th-text hover:border-[#58a6ff]/50 transition-all"
              title={isDark ? "切换亮色主题" : "切换暗色主题"}
            >
              {isDark ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          )}
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname.startsWith(item.href)
                  ? "bg-[#3fb950]/15 text-[#3fb950] border border-[#3fb950]/30"
                  : "text-th-text2 hover:text-th-text hover:bg-th-hover"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-th-border space-y-2">
          {session?.user && (
            <div className="flex items-center gap-2 px-1 mb-1">
              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-[#3fb950] to-[#58a6ff] flex items-center justify-center text-xs font-bold text-white shrink-0">
                {(session.user.displayName || session.user.name || "T").charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-mono text-th-text2 truncate">
                {session.user.displayName || session.user.name}
              </span>
            </div>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-th-text2 hover:text-[#f85149] hover:bg-[#f85149]/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            退出登录
          </button>
        </div>
      </aside>
    </>
  );
}
