import { NextRequest, NextResponse } from "next/server";
import { getServerSession, requireTeacher } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

// GET /api/teacher/grading/list?type=exam|practice&page=1&search=xxx
export async function GET(req: NextRequest) {
  const session = await getServerSession();
  try { await requireTeacher(session); } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const schoolId = session!.user.schoolId;
  if (!schoolId) {
    return NextResponse.json({ error: "Teacher has no school" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "practice";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const search = searchParams.get("search")?.trim() ?? "";
  const skip = (page - 1) * PAGE_SIZE;

  if (type === "exam") {
    const where = {
      isCorrect: null as null,
      question: { type: "CODING" as const },
      userAnswer: { not: null as null },
      session: { user: { schoolId } },
      ...(search ? {
        OR: [
          { session: { user: { displayName: { contains: search, mode: "insensitive" as const } } } },
          { session: { user: { username: { contains: search, mode: "insensitive" as const } } } },
          { question: { content: { contains: search, mode: "insensitive" as const } } },
        ],
      } : {}),
    };

    const [total, items] = await Promise.all([
      prisma.examAnswer.count({ where }),
      prisma.examAnswer.findMany({
        where,
        skip,
        take: PAGE_SIZE,
        orderBy: { savedAt: "desc" },
        include: {
          question: { select: { content: true, description: true, correctAnswer: true, scoringCriteria: true } },
          session: { include: { user: { select: { displayName: true, username: true } } } },
        },
      }),
    ]);

    return NextResponse.json({
      total,
      page,
      pageSize: PAGE_SIZE,
      totalPages: Math.ceil(total / PAGE_SIZE),
      items: items.map(a => ({
        id: a.id,
        type: "exam",
        userAnswer: a.userAnswer!,
        questionContent: a.question.content,
        questionDescription: a.question.description,
        correctAnswer: a.question.correctAnswer,
        scoringCriteria: a.question.scoringCriteria,
        participantName: a.session.user.displayName,
        username: a.session.user.username,
        sessionId: a.sessionId,
        answeredAt: a.savedAt.toISOString(),
        comment: a.comment,
      })),
    });
  } else {
    const where = {
      isCorrect: null as null,
      isSkipped: false,
      question: { type: "CODING" as const },
      userAnswer: { not: null as null },
      session: { user: { schoolId } },
      ...(search ? {
        OR: [
          { session: { participantName: { contains: search, mode: "insensitive" as const } } },
          { question: { content: { contains: search, mode: "insensitive" as const } } },
        ],
      } : {}),
    };

    const [total, items] = await Promise.all([
      prisma.practiceAnswer.count({ where }),
      prisma.practiceAnswer.findMany({
        where,
        skip,
        take: PAGE_SIZE,
        orderBy: { answeredAt: "desc" },
        include: {
          question: { select: { content: true, description: true, correctAnswer: true, scoringCriteria: true } },
          session: { select: { participantName: true, startedAt: true } },
        },
      }),
    ]);

    return NextResponse.json({
      total,
      page,
      pageSize: PAGE_SIZE,
      totalPages: Math.ceil(total / PAGE_SIZE),
      items: items.map(a => ({
        id: a.id,
        type: "practice",
        userAnswer: a.userAnswer!,
        questionContent: a.question.content,
        questionDescription: a.question.description,
        correctAnswer: a.question.correctAnswer,
        scoringCriteria: a.question.scoringCriteria,
        participantName: a.session.participantName,
        username: null,
        sessionId: a.sessionId,
        answeredAt: a.answeredAt.toISOString(),
        comment: a.comment,
      })),
    });
  }
}
