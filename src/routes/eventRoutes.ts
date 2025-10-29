import { Router } from "express";

import {
  createEvent,
  deleteEvent,
  getEvent,
  listEvents,
  listEventRegistrations,
  registerForEvent,
  unregisterFromEvent,
  updateEvent,
  addEventMedia,
  removeEventMedia
} from "../controllers/eventController";
import { authenticate } from "../middlewares/authMiddleware";
import { authorizePermissions } from "../middlewares/authorizationMiddleware";
import { eventMediaUpload } from "../middlewares/eventUploadMiddleware";

const router = Router();

router.get("/events", authenticate(), listEvents);
router.get("/events/:id", authenticate(), getEvent);
router.get("/events/:id/registrations", authenticate(), listEventRegistrations);
router.post("/events", authenticate(), eventMediaUpload, createEvent);
router.put("/events/:id", authenticate(), eventMediaUpload, updateEvent);
router.post("/events/:id/media", authenticate(), eventMediaUpload, addEventMedia);
router.delete("/events/:id/media", authenticate(), removeEventMedia);
router.delete("/events/:id", authenticate(), deleteEvent);
router.post("/events/:id/register", authenticate(), registerForEvent);
router.post("/events/:id/unregister", authenticate(), unregisterFromEvent);

export default router;
