import { headers } from "next/headers";

async function getStats() {
  const host = headers().get("host") ?? "localhost:3000";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const res = await fetch(`${protocol}://${host}/api/admin/stats`, {
    cache: "no-store",
    headers: { cookie: headers().get("cookie") ?? "" },
  });
  if (!res.ok) return { totalUsers: 0, totalExamSessions: 0, totalPracticeSessions: 0 };
  return res.json();
}

export default async function AdminStatsPage() {
  const { totalUsers, totalExamSessions, totalPracticeSessions } = await getStats();

  const cards = [
    { label: "注册用户总数", value: totalUsers, color: "bg-[#388bfd]/10 text-[#58a6ff] border border-[#388bfd]/30" },
    { label: "考试总次数", value: totalExamSessions, color: "bg-[#3fb950]/10 text-[#3fb950] border border-[#3fb950]/30" },
    { label: "练习总次数", value: totalPracticeSessions, color: "bg-[#bc8cff]/10 text-[#bc8cff] border border-[#bc8cff]/30" },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-th-text mb-6">统计数据</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div key={card.label} className={`rounded-lg p-6 ${card.color}`}>
            <p className="text-sm font-medium opacity-80 mb-1">{card.label}</p>
            <p className="text-4xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
