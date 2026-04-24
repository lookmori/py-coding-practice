"use client";

import { motion } from "framer-motion";
import Link from "next/link";

interface Props {
  userName: string;
  isAdmin: boolean;
}

const codeLines = [
  { text: "def solve_problem(question):", color: "text-[#ff7b72]" },
  { text: '    """Python 答题平台"""', color: "text-th-text2" },
  { text: "    answer = think_carefully()", color: "text-th-text" },
  { text: "    return submit(answer)", color: "text-th-text" },
  { text: "", color: "" },
  { text: "# 开始你的 Python 之旅 🐍", color: "text-th-text2" },
];

const cards = [
  {
    href: "/exam",
    title: "考试模式",
    desc: "限时答题，防作弊监控，自动交卷",
    icon: "⏱",
    badge: "限时考试",
    badgeClass: "bg-[#f78166]/20 text-[#f78166]",
    borderHover: "hover:border-[#f78166]/60 hover:shadow-[0_0_30px_rgba(247,129,102,0.15)]",
    code: "exam.start()",
    codeColor: "text-[#f78166]",
    features: ["25 道选择题", "10 道判断题", "3 道编程题"],
  },
  {
    href: "/practice",
    title: "练习模式",
    desc: "自由练习，实时排行榜，可跳过题目",
    icon: "🚀",
    badge: "自由练习",
    badgeClass: "bg-[#3fb950]/20 text-[#3fb950]",
    borderHover: "hover:border-[#3fb950]/60 hover:shadow-[0_0_30px_rgba(63,185,80,0.15)]",
    code: "practice.run()",
    codeColor: "text-[#3fb950]",
    features: ["实时排行榜", "可跳过题目", "完成度统计"],
  },
  {
    href: "/records",
    title: "个人记录",
    desc: "查看历史记录，回顾答题详情",
    icon: "📊",
    badge: "历史记录",
    badgeClass: "bg-[#bc8cff]/20 text-[#bc8cff]",
    borderHover: "hover:border-[#bc8cff]/60 hover:shadow-[0_0_30px_rgba(188,140,255,0.15)]",
    code: "records.view()",
    codeColor: "text-[#bc8cff]",
    features: ["考试记录", "练习记录", "教师评语"],
  },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export default function HomeClient({ userName, isAdmin }: Props) {
  return (
    <div className="min-h-screen bg-th-bg overflow-hidden">
      <div className="fixed inset-0 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(88,166,255,0.06) 1px, transparent 0)", backgroundSize: "40px 40px" }} />
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-[#58a6ff]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-[#3fb950]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-4 py-16">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="text-center mb-16">
          <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="inline-block text-6xl mb-6">🐍</motion.div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            <span className="text-th-text">Python </span>
            <span className="bg-gradient-to-r from-[#58a6ff] to-[#3fb950] bg-clip-text text-transparent">答题平台</span>
          </h1>
          <p className="text-th-text2 text-lg mb-2">
            欢迎回来，<span className="text-[#58a6ff] font-semibold">{userName}</span>
          </p>
          <p className="text-th-muted text-sm font-mono">
            <span className="text-[#ff7b72]">print</span>
            <span className="text-th-text">(</span>
            <span className="text-[#a5d6ff]">&quot;准备好挑战了吗？&quot;</span>
            <span className="text-th-text">)</span>
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-12 rounded-xl border border-th-border bg-th-bg2 overflow-hidden shadow-2xl">
          <div className="flex items-center gap-2 border-b border-th-border bg-th-card px-4 py-3">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
              <div className="h-3 w-3 rounded-full bg-[#28c840]" />
            </div>
            <span className="ml-2 text-xs text-th-text2 font-mono">main.py</span>
            <div className="ml-auto flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-[#3fb950] animate-pulse" />
              <span className="text-xs text-[#3fb950]">running</span>
            </div>
          </div>
          <div className="p-5 font-mono text-sm">
            {codeLines.map((line, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1, duration: 0.3 }}
                className="flex items-center gap-4 leading-7">
                <span className="w-5 text-right text-th-muted text-xs select-none">{line.text ? i + 1 : ""}</span>
                <span className={line.color}>{line.text}</span>
              </motion.div>
            ))}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
              className="flex items-center gap-4 leading-7 mt-1">
              <span className="w-5" />
              <span className="text-th-text2 text-xs">▶ Output: </span>
              <span className="text-[#3fb950] text-xs">Ready to code! 🎯</span>
            </motion.div>
          </div>
        </motion.div>

        <motion.div variants={container} initial="hidden" animate="show"
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {cards.map((card) => (
            <motion.div key={card.href} variants={item}>
              <Link href={card.href}
                className={`group block rounded-xl border border-th-border bg-th-bg2 p-5 transition-all duration-300 ${card.borderHover}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="text-2xl">{card.icon}</div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${card.badgeClass}`}>{card.badge}</span>
                </div>
                <h2 className="text-base font-bold text-th-text mb-1 group-hover:text-white transition-colors">{card.title}</h2>
                <p className="text-xs text-th-text2 mb-4 leading-relaxed">{card.desc}</p>
                <div className="rounded-md bg-th-bg border border-[#21262d] px-3 py-2 mb-4">
                  <span className="font-mono text-xs text-th-muted">$ </span>
                  <span className={`font-mono text-xs ${card.codeColor}`}>{card.code}</span>
                  <span className="inline-block w-1.5 h-3.5 bg-current ml-0.5 animate-blink opacity-70" />
                </div>
                <ul className="space-y-1">
                  {card.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-th-text2">
                      <span className="text-[#3fb950]">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex items-center gap-1 text-xs text-th-muted group-hover:text-[#58a6ff] transition-colors">
                  <span>进入</span>
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {isAdmin && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <Link href="/admin"
              className="group flex items-center justify-between rounded-xl border border-th-border bg-th-bg2 px-5 py-4 transition-all hover:border-[#e3b341]/50 hover:shadow-[0_0_20px_rgba(227,179,65,0.1)]">
              <div className="flex items-center gap-3">
                <span className="text-xl">⚙️</span>
                <div>
                  <p className="text-sm font-semibold text-th-text">管理后台</p>
                  <p className="text-xs text-th-text2 font-mono">admin.dashboard()</p>
                </div>
              </div>
              <span className="bg-[#e3b341]/20 text-[#e3b341] text-xs font-medium px-2.5 py-0.5 rounded-full">管理员</span>
            </Link>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          className="mt-12 flex items-center justify-center gap-8 text-xs text-th-muted font-mono">
          {[
            { label: "题型", value: "MCQ · TFQ · CODING" },
            { label: "功能", value: "考试 · 练习 · 排行榜" },
            { label: "语言", value: "Python 3.x" },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <div className="text-th-text2 mb-0.5"># {label}</div>
              <div className="text-[#58a6ff]">{value}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
