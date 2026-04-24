import { NextRequest, NextResponse } from "next/server";
import { getServerSession, requireTeacher, requireTeacherOwnsStudent } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PUT(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const session = await getServerSession();
  try {
    await requireTeacher(session);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { userId } = params;

    try {
      await requireTeacherOwnsStudent(session, userId);
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { displayName, password } = await req.json();

    if (!displayName && !password) {
      return NextResponse.json(
        { error: "displayName or password is required" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (displayName) updateData.displayName = displayName;
    if (password) updateData.passwordHash = await bcrypt.hash(password, 10);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        schoolId: true,
        teacherId: true,
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const session = await getServerSession();
  try {
    await requireTeacher(session);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { userId } = params;

    try {
      await requireTeacherOwnsStudent(session, userId);
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
