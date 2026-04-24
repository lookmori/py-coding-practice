"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";


export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(false);
    setLoading(true);
    const result = await signIn("credentials", { username, password, redirect: false });
    setLoading(false);
    if (result?.ok) router.push("/");
    else setError(true);
  }

  return (
    <div className="min-h-screen bg-th-bg flex items-center justify-center overflow-hidden">
      {/* 背景网格 */}
      <div className="fixed inset-0 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(88,166,255,0.06) 1px, transparent 0)", backgroundSize: "40px 40px" }} />
      <div className="fixed top-1/4 left-1/4 w-64 h-64 bg-[#58a6ff]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-64 h-64 bg-[#3fb950]/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="relative w-full max-w-sm mx-4">

        {/* 终端窗口 */}
        <div className="rounded-xl border border-th-border bg-th-bg2 shadow-2xl overflow-hidden">
          {/* 标题栏 */}
          <div className="flex items-center gap-2 border-b border-th-border bg-th-card px-4 py-3">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
              <div className="h-3 w-3 rounded-full bg-[#28c840]" />
            </div>
            <span className="ml-2 text-xs text-th-text2 font-mono">login.py</span>
          </div>

          <div className="p-6">
            {/* Logo */}
            <div className="text-center mb-6">
              <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 3, repeat: Infinity }}
                className="text-4xl mb-3">🐍</motion.div>
              <h1 className="font-mono text-lg font-bold text-th-text">
                python<span className="text-[#3fb950]">-quiz</span>
              </h1>
              <p className="text-xs text-th-text2 font-mono mt-1"># 请输入你的凭据</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-th-text2 mb-1.5">
                  <span className="text-[#ff7b72]">str</span> username
                </label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required
                  className="w-full rounded-lg border border-th-border bg-th-bg px-3 py-2.5 text-sm font-mono text-th-text placeholder-[#6e7681] outline-none transition-all focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]/30"
                  placeholder="your_username" />
              </div>
              <div>
                <label className="block text-xs font-mono text-th-text2 mb-1.5">
                  <span className="text-[#ff7b72]">str</span> password
                </label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required
                    className="w-full rounded-lg border border-th-border bg-th-bg px-3 py-2.5 pr-10 text-sm font-mono text-th-text placeholder-[#6e7681] outline-none transition-all focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]/30"
                    placeholder="••••••••" />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6e7681] hover:text-th-text2 transition-colors"
                    aria-label={showPassword ? "隐藏密码" : "显示密码"}
                  >
                    {showPassword ? (
                      // Eye-slash icon
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      // Eye icon
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  className="rounded-lg border border-[#f85149]/30 bg-[#f85149]/10 px-4 py-3 font-mono text-xs text-[#f85149]">
                  <span className="text-[#ff7b72]">AuthError</span>: 账号或密码错误
                </motion.div>
              )}

              <button type="submit" disabled={loading}
                className="w-full rounded-lg bg-[#238636] py-2.5 text-sm font-mono font-semibold text-white transition-all hover:bg-[#2ea043] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    authenticating...
                  </span>
                ) : (
                  <span>login() <span className="opacity-60">→</span></span>
                )}
              </button>
            </form>

            <p className="mt-4 text-center font-mono text-xs text-th-muted">
              # 账号由管理员创建
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
