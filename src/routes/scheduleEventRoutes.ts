import { Router } from "express";
import {
  createScheduleEvent,
  listScheduleEvents,
  getScheduleEventById,
  updateScheduleEvent,
  deleteScheduleEvent
} from "../controllers/scheduleEventController";
import { authenticate } from "../middlewares/authMiddleware";
import { scheduleEventMediaUpload } from "../middlewares/scheduleEventUploadMiddleware";

const router = Router();

router.post("/schedule-events", authenticate(), scheduleEventMediaUpload, createScheduleEvent);
router.get("/schedule-events", authenticate(), listScheduleEvents);
router.get("/schedule-events/:id", authenticate(), getScheduleEventById);
router.put("/schedule-events/:id", authenticate(), scheduleEventMediaUpload, updateScheduleEvent);
router.delete("/schedule-events/:id", authenticate(), deleteScheduleEvent);

export default router;
