import { headers } from "next/headers";
import RecordsTabs from "./RecordsTabs";

async function getRecords() {
  const host = headers().get("host") ?? "localhost:3000";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const res = await fetch(`${protocol}://${host}/api/admin/records`, {
    cache: "no-store",
    headers: { cookie: headers().get("cookie") ?? "" },
  });
  if (!res.ok) return { examSessions: [], practiceSessions: [] };
  return res.json();
}

export default async function AdminRecordsPage() {
  const { examSessions, practiceSessions } = await getRecords();

  return (
    <div>
      <h1 className="text-xl font-bold text-th-text mb-4">记录查看</h1>
      <RecordsTabs examSessions={examSessions} practiceSessions={practiceSessions} />
    </div>
  );
}
