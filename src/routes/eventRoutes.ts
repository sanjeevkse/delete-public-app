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

router.get("/events", authenticate(), authorizePermissions("*"), listEvents);
router.get("/events/:id", authenticate(), authorizePermissions("*"), getEvent);
router.get(
  "/events/:id/registrations",
  authenticate(),
  authorizePermissions("*"),
  listEventRegistrations
);
router.post("/events", authenticate(), authorizePermissions("*"), createEvent);
router.put("/events/:id", authenticate(), authorizePermissions("*"), updateEvent);
router.delete("/events/:id", authenticate(), authorizePermissions("*"), deleteEvent);
router.post("/events/:id/register", authenticate(), authorizePermissions("*"), registerForEvent);
router.post(
  "/events/:id/unregister",
  authenticate(),
  authorizePermissions("*"),
  unregisterFromEvent
);

export default router;
