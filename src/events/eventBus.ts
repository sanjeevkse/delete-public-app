import { EventEmitter } from "events";

import logger from "../utils/logger";

export enum AppEvent {
  USER_CREATED = "user.created",
  USER_UPDATED = "user.updated",
  USER_LOGGED_IN = "user.logged_in",
  USER_LOGOUT = "user.logout",
  EVENT_PUBLISHED = "event.published",
  POST_PUBLISHED = "post.published",
  AUDIT_LOGGED = "audit.logged"
}

type EventPayload = Record<string, unknown>;

const eventBus = new EventEmitter();
eventBus.setMaxListeners(50);

eventBus.on("error", (error) => {
  logger.error({ err: error }, "Event bus emitted an error");
});

export const emitEvent = <T extends EventPayload>(event: AppEvent, payload: T): void => {
  logger.debug({ event, payload }, "Emitting application event");
  eventBus.emit(event, payload);
};

export const subscribeEvent = <T extends EventPayload>(
  event: AppEvent,
  listener: (payload: T) => void
): void => {
  eventBus.on(event, listener as (payload: EventPayload) => void);
};

export default eventBus;
