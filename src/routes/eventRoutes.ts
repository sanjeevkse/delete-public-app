import { Router } from "express";

import {
  createEvent,
  deleteEvent,
  getEvent,
  listEvents,
  listEventRegistrations,
  registerForEvent,
  unregisterFromEvent,
  updateEvent
} from "../controllers/eventController";
import { authenticate } from "../middlewares/authMiddleware";
import { authorizePermissions } from "../middlewares/authorizationMiddleware";

const router = Router();

router.get("/events", authenticate(), authorizePermissions("events:list"), listEvents);
router.get("/events/:id", authenticate(), authorizePermissions("events:view"), getEvent);
router.get(
  "/events/:id/registrations",
  authenticate(),
  authorizePermissions("events:view"),
  listEventRegistrations
);
router.post("/events", authenticate(), authorizePermissions("events:create"), createEvent);
router.put("/events/:id", authenticate(), authorizePermissions("events:update"), updateEvent);
router.delete("/events/:id", authenticate(), authorizePermissions("events:delete"), deleteEvent);
router.post(
  "/events/:id/register",
  authenticate(),
  authorizePermissions("events:view"),
  registerForEvent
);
router.post(
  "/events/:id/unregister",
  authenticate(),
  authorizePermissions("events:view"),
  unregisterFromEvent
);

export default router;
