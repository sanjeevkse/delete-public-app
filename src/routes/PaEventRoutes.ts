import { Router } from "express";
import {
  createPaEvent,
  listPaEvents,
  getPaEventById,
  updatePaEvent,
  deletePaEvent
} from "../controllers/PaEventController";
import { listPaEventLogs, getPaEventLogById } from "../controllers/PaEventLogController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

router.post("/pa-events", authenticate(), createPaEvent);
router.get("/pa-events", authenticate(), listPaEvents);
router.get("/pa-events/:id", authenticate(), getPaEventById);
router.put("/pa-events/:id", authenticate(), updatePaEvent);
router.delete("/pa-events/:id", authenticate(), deletePaEvent);
router.get("/pa-events/:id/logs", authenticate(), listPaEventLogs);
router.get("/pa-event-logs/:logId", authenticate(), getPaEventLogById);

export default router;
