import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import AdminSidebar from "./AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();

  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    redirect("/403");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-th-bg">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6 bg-th-bg text-th-text">{children}</main>
    </div>
  );
}
