import { NextAuthOptions, Session, getServerSession as nextAuthGetServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findFirst({
          where: {
            username: credentials.username,
            deletedAt: null,
          },
          select: {
            id: true,
            username: true,
            displayName: true,
            passwordHash: true,
            role: true,
            schoolId: true,
            teacherId: true,
          },
        });

        if (!user) return null;

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) return null;

        // Update lastLoginAt
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          name: user.displayName,
          email: user.username,
          role: user.role,
          displayName: user.displayName,
          schoolId: user.schoolId ?? undefined,
          teacherId: user.teacherId ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.displayName = user.displayName;
        token.schoolId = user.schoolId;
        token.teacherId = user.teacherId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.displayName = token.displayName;
        session.user.schoolId = token.schoolId;
        session.user.teacherId = token.teacherId;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
};

export async function getServerSession() {
  return nextAuthGetServerSession(authOptions);
}

export async function requireAuth(session: Awaited<ReturnType<typeof getServerSession>>) {
  if (!session?.user) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return session;
}

export async function requireAdmin(session: Awaited<ReturnType<typeof getServerSession>>) {
  if (!session?.user) {
    throw new Response("Unauthorized", { status: 401 });
  }
  if (session.user.role !== UserRole.ADMIN) {
    throw new Response("Forbidden", { status: 403 });
  }
  return session;
}

export async function requireTeacher(session: Session | null) {
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  if (session.user.role !== UserRole.TEACHER) {
    throw new Error("Forbidden");
  }
  return session;
}

export async function requireSameSchool(session: Session | null, targetSchoolId: string) {
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (session.user.role === UserRole.ADMIN) return; // admin bypass
  if (session.user.schoolId !== targetSchoolId) {
    throw new Error("Forbidden");
  }
}

export async function requireTeacherOwnsStudent(session: Session | null, studentId: string) {
  if (!session?.user?.id) throw new Error("Unauthorized");
  const { prisma } = await import("@/lib/prisma");
  const student = await prisma.user.findUnique({ where: { id: studentId }, select: { schoolId: true } });
  if (!student || student.schoolId !== session.user.schoolId) {
    throw new Error("Forbidden");
  }
}
