import { Router } from "express";
import { getFormEventReport } from "../controllers/reportController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

/**
 * Get form event report with details, metrics, and paginated submissions
 * GET /reports/form-events/:formEventId
 * Query params: page, limit
 */
router.get("/form-events/:formEventId", authenticate(), getFormEventReport);

export default router;
