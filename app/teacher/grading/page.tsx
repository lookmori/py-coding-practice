import GradingClient from "./GradingClient";
import { headers } from "next/headers";

async function getCounts() {
  const host = headers().get("host") ?? "localhost:3000";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const cookie = headers().get("cookie") ?? "";

  const [examRes, practiceRes] = await Promise.all([
    fetch(`${protocol}://${host}/api/teacher/grading/list?type=exam&page=1`, { cache: "no-store", headers: { cookie } }),
    fetch(`${protocol}://${host}/api/teacher/grading/list?type=practice&page=1`, { cache: "no-store", headers: { cookie } }),
  ]);

  const examData = examRes.ok ? await examRes.json() : { total: 0 };
  const practiceData = practiceRes.ok ? await practiceRes.json() : { total: 0 };

  return { examCount: examData.total ?? 0, practiceCount: practiceData.total ?? 0 };
}

export default async function TeacherGradingPage() {
  const { examCount, practiceCount } = await getCounts();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-th-text">编程题评分</h1>
        <p className="mt-1 text-sm text-th-text2">手动评判本校学生的编程大题，支持添加 Markdown 格式评语。</p>
      </div>
      <GradingClient initialExamCount={examCount} initialPracticeCount={practiceCount} />
    </div>
  );
}
