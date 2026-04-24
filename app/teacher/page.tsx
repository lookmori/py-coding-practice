import { getServerSession } from "@/lib/auth";
import Link from "next/link";

export default async function TeacherHomePage() {
  const session = await getServerSession();

  return (
    <div>
      <h1 className="text-xl font-bold text-th-text mb-1">
        欢迎，{session?.user?.displayName ?? "老师"}
      </h1>
      <p className="text-sm text-th-text2 mb-6">通过左侧导航管理本校学生和题库。</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { href: "/teacher/students", icon: "👥", label: "学生管理", desc: "查看和管理本校学生账号" },
          { href: "/teacher/questions", icon: "📝", label: "题库管理", desc: "管理本校题库和题目" },
          { href: "/teacher/records/exam", icon: "⏱", label: "考试记录", desc: "查看本校学生考试记录" },
          { href: "/teacher/records/practice", icon: "🚀", label: "练习记录", desc: "查看本校学生练习记录" },
          { href: "/teacher/grading", icon: "🎯", label: "编程题评分", desc: "手动评判编程大题" },
        ].map(item => (
          <Link key={item.href} href={item.href}
            className="rounded-xl border border-th-border bg-th-card p-5 hover:border-[#3fb950]/50 hover:bg-[#3fb950]/5 transition-all">
            <div className="text-3xl mb-3">{item.icon}</div>
            <h2 className="text-sm font-semibold text-th-text mb-1">{item.label}</h2>
            <p className="text-xs text-th-muted">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
