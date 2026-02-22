import { Router } from "express";
import { getFormEventMetrics, getFormEventReport } from "../controllers/reportController";
import { getBusinessReport } from "../controllers/businessReportController";
import { getPostsReport } from "../controllers/postReportController";
import {
  getPublicEventsMetrics,
  getPublicEventsReport
} from "../controllers/publicEventReportController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

/**
 * Get form event report with details, metrics, and paginated submissions
 * GET /reports/form-events/:formEventId
 * Query params: page, limit
 */
router.get("/form-events/metrics", authenticate(), getFormEventMetrics);
router.get("/form-events/:formEventId", authenticate(), getFormEventReport);
router.get("/posts", authenticate(), getPostsReport);
router.get("/business", authenticate(), getBusinessReport);
router.get("/public-events/metrics", authenticate(), getPublicEventsMetrics);
router.get("/public-events", authenticate(), getPublicEventsReport);

export default router;
