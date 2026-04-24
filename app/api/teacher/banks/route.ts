import { NextRequest, NextResponse } from "next/server";
import { getServerSession, requireTeacher } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BankType, BankVisibility } from "@prisma/client";

export async function GET() {
  const session = await getServerSession();
  try {
    await requireTeacher(session);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const schoolId = session!.user.schoolId;
    if (!schoolId) {
      return NextResponse.json({ error: "Teacher has no school" }, { status: 400 });
    }

    // PUBLIC banks + this school's PRIVATE banks
    const banks = await prisma.questionBank.findMany({
      where: {
        OR: [
          { visibility: BankVisibility.PUBLIC },
          { visibility: BankVisibility.PRIVATE, schoolId },
        ],
      },
      include: { _count: { select: { questions: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(banks);
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  try {
    await requireTeacher(session);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const schoolId = session!.user.schoolId;
    const createdById = session!.user.id;

    if (!schoolId) {
      return NextResponse.json({ error: "Teacher has no school" }, { status: 400 });
    }

    const { name, type, description, durationSecs, visibility, scheduledAt, endAt } = await req.json();

    if (!name || !type) {
      return NextResponse.json({ error: "name and type are required" }, { status: 400 });
    }

    const bank = await prisma.questionBank.create({
      data: {
        name,
        type: type as BankType,
        description,
        durationSecs: durationSecs ?? 5400,
        visibility: (visibility as BankVisibility) ?? BankVisibility.PRIVATE,
        createdById,
        schoolId,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        endAt: endAt ? new Date(endAt) : null,
      },
    });

    return NextResponse.json(bank, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
