import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import TeacherSidebar from "./TeacherSidebar";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();

  if (!session?.user || session.user.role !== UserRole.TEACHER) {
    redirect("/403");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-th-bg">
      <TeacherSidebar />
      <main className="flex-1 overflow-y-auto p-6 bg-th-bg text-th-text">{children}</main>
    </div>
  );
}
