import Link from "next/link";
import { getServerSession } from "@/lib/auth";

const cards = [
  { href: "/admin/users", title: "用户管理", desc: "查看、导入、修改和删除用户", icon: "👥" },
  { href: "/admin/questions", title: "题库管理", desc: "查看、导入和删除题目", icon: "📝" },
  { href: "/admin/grade", title: "编程题评分", desc: "手动评判考试和练习中的编程大题", icon: "🎯" },
  { href: "/admin/records", title: "记录查看", desc: "查看所有用户的考试和练习记录", icon: "📋" },
  { href: "/admin/stats", title: "统计数据", desc: "平台整体使用统计", icon: "📊" },
];

export default async function AdminPage() {
  const session = await getServerSession();

  return (
    <div>
      <h1 className="text-2xl font-bold text-th-text mb-2">
        欢迎回来，{session?.user?.displayName ?? session?.user?.name ?? "管理员"}
      </h1>
      <p className="text-th-text2 mb-8">这里是管理员后台，请选择要管理的模块。</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="block bg-th-card rounded-lg border border-th-border p-5 hover:border-[#58a6ff]/50 hover:shadow-md transition-all"
          >
            <div className="text-2xl mb-2">{card.icon}</div>
            <h2 className="text-base font-semibold text-th-text mb-1">{card.title}</h2>
            <p className="text-sm text-th-text2">{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
