import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import HomeClient from "./HomeClient";

export default async function HomePage() {
  const session = await getServerSession();
  if (!session?.user) redirect("/login");
  if (session.user.role === "ADMIN") redirect("/admin");
  if (session.user.role === "TEACHER") redirect("/teacher");
  return <HomeClient userName={session.user.displayName || session.user.name || "用户"} isAdmin={false} />;
}
