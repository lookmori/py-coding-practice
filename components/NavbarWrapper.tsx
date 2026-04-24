"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";

// 在 /admin 和 /teacher 路径下不显示全局导航栏
export default function NavbarWrapper() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin") || pathname.startsWith("/teacher")) return null;
  return <Navbar />;
}
