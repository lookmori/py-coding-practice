import { headers } from "next/headers";
import SchoolsClient from "./SchoolsClient";

async function getSchools() {
  const host = headers().get("host") ?? "localhost:3000";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const res = await fetch(`${protocol}://${host}/api/admin/schools`, {
    cache: "no-store",
    headers: { cookie: headers().get("cookie") ?? "" },
  });
  if (!res.ok) return [];
  return res.json();
}

export default async function AdminSchoolsPage() {
  const schools = await getSchools();

  return (
    <div>
      <h1 className="text-xl font-bold text-th-text mb-1">学校管理</h1>
      <p className="text-sm text-th-text2 mb-6">管理平台中的学校，创建学校后可为其分配老师和学生。</p>
      <SchoolsClient schools={schools} />
    </div>
  );
}
