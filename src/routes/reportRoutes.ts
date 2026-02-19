import { Router } from "express";
import { getFamilyMembersReport, getFormEventReport } from "../controllers/reportController";
import { getPostsReport } from "../controllers/postReportController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

/**
 * Get form event report with details, metrics, and paginated submissions
 * GET /reports/form-events/:formEventId
 * Query params: page, limit
 */
router.get("/form-events/:formEventId", authenticate(), getFormEventReport);
router.get("/family-members", authenticate(), getFamilyMembersReport);
router.get("/posts", authenticate(), getPostsReport);

export default router;
