import { Router } from "express";
import { getFormEventReport } from "../controllers/reportController";
import { getBusinessReport } from "../controllers/businessReportController";
import { getPostsReport } from "../controllers/postReportController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

/**
 * Get form event report with details, metrics, and paginated submissions
 * GET /reports/form-events/:formEventId
 * Query params: page, limit
 */
router.get("/form-events/:formEventId", authenticate(), getFormEventReport);
router.get("/posts", authenticate(), getPostsReport);
router.get("/business", authenticate(), getBusinessReport);

export default router;
