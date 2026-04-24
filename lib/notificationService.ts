import { prisma } from "@/lib/prisma";
import { pushSSE } from "@/lib/sseStore";

export interface CreateNotificationInput {
  recipientId: string;
  sessionType: "exam" | "practice";
  sessionId: string;
  answerId: string;
  questionContent: string;
}

export async function createAndPushNotification(input: CreateNotificationInput): Promise<void> {
  try {
    const notification = await prisma.notification.create({
      data: {
        recipientId: input.recipientId,
        sessionType: input.sessionType,
        sessionId: input.sessionId,
        answerId: input.answerId,
        questionContent: input.questionContent.slice(0, 100),
        isRead: false,
      },
    });
    pushSSE(input.recipientId, "new-notification", {
      id: notification.id,
      sessionType: notification.sessionType,
      sessionId: notification.sessionId,
      answerId: notification.answerId,
      questionContent: notification.questionContent,
      createdAt: notification.createdAt.toISOString(),
    });
  } catch (e) {
    console.error("[notificationService] createAndPushNotification failed:", e);
  }
}
