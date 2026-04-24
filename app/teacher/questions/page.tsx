import { headers } from "next/headers";
import TeacherBankManagerClient from "./TeacherBankManagerClient";

async function getBanks() {
  const host = headers().get("host") ?? "localhost:3000";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const res = await fetch(`${protocol}://${host}/api/teacher/banks`, {
    cache: "no-store",
    headers: { cookie: headers().get("cookie") ?? "" },
  });
  if (!res.ok) return [];
  const banks = await res.json();
  return banks.map((b: { id: string; name: string; type: string; description: string | null; durationSecs: number; isActive: boolean; createdAt: string; _count: { questions: number } }) => ({
    id: b.id,
    name: b.name,
    type: b.type,
    description: b.description,
    durationSecs: b.durationSecs,
    isActive: b.isActive,
    createdAt: b.createdAt,
    questionCount: b._count?.questions ?? 0,
  }));
}

export default async function TeacherQuestionsPage() {
  const banks = await getBanks();

  return (
    <div>
      <h1 className="text-xl font-bold text-th-text mb-1">题库管理</h1>
      <p className="text-sm text-th-text2 mb-6">管理本校题库，创建题库组并导入题目。</p>
      <TeacherBankManagerClient banks={banks} />
    </div>
  );
}
