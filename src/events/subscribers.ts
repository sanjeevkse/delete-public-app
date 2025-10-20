import AuditLog from "../models/AuditLog";
import logger from "../utils/logger";
import { AppEvent, subscribeEvent } from "./eventBus";

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

subscribeEvent<{ entityId: number; userId?: number; title: string }>(
  AppEvent.EVENT_PUBLISHED,
  async (payload) => {
    await safeCreateAuditLog("EVENT_PUBLISHED", payload.userId ?? null, {
      eventId: payload.entityId,
      title: payload.title
    });
  }
);

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
