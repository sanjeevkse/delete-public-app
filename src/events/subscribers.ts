import AuditLog from "../models/AuditLog";
import logger from "../utils/logger";
import { AppEvent, subscribeEvent } from "./eventBus";
import notificationService from "../services/notificationService";

const safeCreateAuditLog = async (
  action: string,
  userId: number | null,
  metadataJson: Record<string, unknown>
) => {
  try {
    await AuditLog.create({
      userId,
      action,
      metadataJson
    });
  } catch (error) {
    logger.warn({ err: error, action, metadataJson }, "Failed to persist audit log entry");
  }
};

subscribeEvent<{ userId: number; actorId?: number }>(AppEvent.USER_CREATED, async (payload) => {
  await safeCreateAuditLog("USER_CREATED", payload.actorId ?? payload.userId, {
    userId: payload.userId,
    actorId: payload.actorId ?? null
  });
});

subscribeEvent<{ userId: number; actorId?: number }>(AppEvent.USER_UPDATED, async (payload) => {
  await safeCreateAuditLog("USER_UPDATED", payload.actorId ?? payload.userId, {
    userId: payload.userId,
    actorId: payload.actorId ?? null
  });
});

subscribeEvent<{
  entityId: number;
  userId?: number;
  title: string;
  description?: string;
  place?: string;
}>(AppEvent.EVENT_PUBLISHED, async (payload) => {
  console.log("📱 EVENT_PUBLISHED subscriber triggered for:", payload.title);

  await safeCreateAuditLog("EVENT_PUBLISHED", payload.userId ?? null, {
    eventId: payload.entityId,
    title: payload.title
  });

  // Send push notification to all users
  console.log("📤 Attempting to send push notification to all users...");
  try {
    await notificationService.sendToAllUsers(
      {
        title: "New Event Created! 🎉",
        body: `${payload.title}${payload.place ? ` at ${payload.place}` : ""}`,
        data: {
          type: "event",
          eventId: payload.entityId.toString(),
          title: payload.title
        }
      },
      {
        notificationType: "event_created",
        entityType: "event",
        entityId: payload.entityId,
        triggeredBy: payload.userId
      }
    );
    logger.info({ eventId: payload.entityId }, "Push notification sent for new event");
  } catch (error) {
    logger.warn(
      { err: error, eventId: payload.entityId },
      "Failed to send push notification for event"
    );
  }
});

subscribeEvent<{ entityId: number; userId: number; description: string }>(
  AppEvent.POST_PUBLISHED,
  async (payload) => {
    await safeCreateAuditLog("POST_PUBLISHED", payload.userId, {
      postId: payload.entityId,
      description: payload.description
    });
  }
);

subscribeEvent<{ userId: number }>(AppEvent.USER_LOGGED_IN, async (payload) => {
  await safeCreateAuditLog("USER_LOGGED_IN", payload.userId, {
    userId: payload.userId
  });
});
