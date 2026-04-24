import { NextRequest, NextResponse } from "next/server";
import { getServerSession, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BankType, BankVisibility } from "@prisma/client";

export async function GET() {
  const session = await getServerSession();
  try { await requireAdmin(session); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  const banks = await prisma.questionBank.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { questions: true } } },
  });
  return NextResponse.json(banks);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  try { await requireAdmin(session); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  const { name, type, description, durationSecs, visibility, scheduledAt, endAt } = await req.json();
  if (!name || !type) return NextResponse.json({ error: "name and type required" }, { status: 400 });

  const bank = await prisma.questionBank.create({
    data: {
      name,
      type: type as BankType,
      description,
      durationSecs: durationSecs ?? 5400,
      visibility: (visibility as BankVisibility) ?? BankVisibility.PRIVATE,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      endAt: endAt ? new Date(endAt) : null,
    },
  });
  return NextResponse.json(bank);
}
