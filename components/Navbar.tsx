"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";

import NotificationBadge from "@/components/NotificationBadge";

const navLinks = [
  { href: "/", zh: "首页", en: "~/home", icon: "🏠" },
  { href: "/exam", zh: "考试", en: "exam", icon: "⏱" },
  { href: "/practice", zh: "练习", en: "practice", icon: "🚀" },
  { href: "/leaderboard", zh: "排行榜", en: "leaderboard", icon: "🏆" },
  { href: "/completion", zh: "完成度", en: "stats", icon: "📈" },
  { href: "/records", zh: "个人记录", en: "records", icon: "📋" },
];

// 文字切换组件：默认中文，hover 变英文
function SwitchLabel({ zh, en }: { zh: string; en: string }) {
  return (
    <span className="relative inline-flex flex-col overflow-hidden" style={{ height: "1.25em" }}>
      {/* 用不可见的英文撑开宽度，确保容器足够宽 */}
      <span className="invisible whitespace-nowrap font-mono text-sm">{en}</span>
      {/* 中文：默认显示，hover 时上移消失 */}
      <span className="absolute inset-0 flex items-center transition-transform duration-200 group-hover:-translate-y-full whitespace-nowrap">
        {zh}
      </span>
      {/* 英文：默认在下方，hover 时上移进入 */}
      <span className="absolute inset-0 flex items-center translate-y-full transition-transform duration-200 group-hover:translate-y-0 font-mono text-[#58a6ff] whitespace-nowrap">
        {en}
      </span>
    </span>
  );
}

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";
  const isAdmin = session?.user?.role === "ADMIN";
  const isTeacher = session?.user?.role === "TEACHER";
  const isStudent = session?.user?.role === "STUDENT";
  const links = isAdmin
    ? [...navLinks, { href: "/admin", zh: "管理后台", en: "admin", icon: "⚙️" }]
    : isTeacher
    ? [...navLinks, { href: "/teacher", zh: "教师后台", en: "teacher", icon: "🎓" }]
    : navLinks;

  return (
    <nav className="bg-th-bg2 border-b border-th-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-2">
            <span className="text-lg">🐍</span>
            <span className="font-mono text-sm font-bold">
              <span className="text-[#58a6ff] group-hover:text-[#79c0ff] transition-colors">python</span>
              <span className="text-[#3fb950]">-quiz</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => {
              const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
              return (
                <Link key={link.href} href={link.href}
                  className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all ${
                    isActive
                      ? "bg-[#388bfd]/15 text-th-text border border-[#388bfd]/30"
                      : "text-th-text2 hover:text-th-text hover:bg-th-hover"
                  }`}>
                  <span>{link.icon}</span>
                  <SwitchLabel zh={link.zh} en={link.en} />
                  {isActive && <span className="text-[#58a6ff] animate-blink text-xs">_</span>}
                </Link>
              );
            })}
          </div>

          {/* User area */}
          <div className="hidden md:flex items-center gap-3">
            {/* 主题切换按钮 */}
            {mounted && (
              <button
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="group flex items-center justify-center w-8 h-8 rounded-md border border-th-border bg-th-bg text-th-text2 hover:text-th-text hover:border-[#58a6ff]/50 transition-all"
                title={isDark ? "切换亮色主题" : "切换暗色主题"}
              >
                {isDark ? (
                  // 太阳图标
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                  </svg>
                ) : (
                  // 月亮图标
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
            )}
            {isStudent && <NotificationBadge />}
            {session?.user && (
              <>
                <div className="flex items-center gap-2 rounded-md border border-th-border bg-th-bg px-3 py-1.5">
                  <div className="h-5 w-5 rounded-full bg-gradient-to-br from-[#58a6ff] to-[#3fb950] flex items-center justify-center text-xs font-bold text-white">
                    {(session.user.displayName || session.user.name || "U").charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-mono text-th-text">
                    {session.user.displayName || session.user.name}
                  </span>
                </div>
                {/* 退出登录：默认中文，hover 变英文 */}
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="group text-xs px-3 py-1.5 rounded-md border border-th-border text-th-text2 hover:text-[#f85149] hover:border-[#f85149]/50 transition-all overflow-hidden"
                >
                  <SwitchLabel zh="退出登录" en="logout" />
                </button>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 rounded-md text-th-text2 hover:bg-th-hover transition-colors"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu（移动端直接显示中文） */}
      {menuOpen && (
        <div className="md:hidden border-t border-th-border bg-th-bg2 px-4 pb-4 pt-2 space-y-1">
          {links.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all ${
                  isActive ? "bg-[#388bfd]/15 text-[#58a6ff]" : "text-th-text2 hover:text-th-text hover:bg-th-hover"
                }`}>
                <span>{link.icon}</span>
                <span>{link.zh}</span>
              </Link>
            );
          })}
          {session?.user && (
            <div className="pt-2 border-t border-th-border flex items-center justify-between">
              <span className="text-xs font-mono text-th-text2">
                {session.user.displayName || session.user.name}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-xs text-[#f85149] hover:underline"
              >
                退出登录
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
