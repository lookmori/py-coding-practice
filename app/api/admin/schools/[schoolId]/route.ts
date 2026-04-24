import { NextRequest, NextResponse } from "next/server";
import { getServerSession, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: { schoolId: string } }
) {
  const session = await getServerSession();
  try {
    await requireAdmin(session);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { schoolId } = params;
    const { name } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    const updated = await prisma.school.update({
      where: { id: schoolId },
      data: { name },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
