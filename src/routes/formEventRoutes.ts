import { Router } from "express";

import {
  createFormEvent,
  deleteFormEvent,
  getFormEvent,
  listFormEvents,
  updateFormEvent
} from "../controllers/formEventController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

router.get("/form-events", authenticate(), listFormEvents);
router.get("/form-events/:id", authenticate(), getFormEvent);
router.post("/form-events", authenticate(), createFormEvent);
router.put("/form-events/:id", authenticate(), updateFormEvent);
router.delete("/form-events/:id", authenticate(), deleteFormEvent);

export default router;
