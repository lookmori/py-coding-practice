import { UserRole } from "@prisma/client";
import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      displayName: string;
      schoolId?: string;
      teacherId?: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: UserRole;
    displayName: string;
    schoolId?: string;
    teacherId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    displayName: string;
    schoolId?: string;
    teacherId?: string;
  }
}
