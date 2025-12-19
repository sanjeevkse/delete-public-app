import { Router } from "express";

import {
  submitForm,
  getFormSubmission,
  listFormSubmissions,
  listMySubmissions,
  updateSubmissionStatus,
  deleteFormSubmission,
  getFormEventStats
} from "../controllers/formSubmissionController";
import { authenticate } from "../middlewares/authMiddleware";
import { formSubmissionUpload } from "../middlewares/formSubmissionUploadMiddleware";

const router = Router();

/**
 * Submit a form for a specific form event
 * POST /form-submissions/events/:formEventId/submit
 * Accepts multipart form-data with optional file attachments
 */
router.post("/events/:formEventId/submit", authenticate(), formSubmissionUpload, submitForm);

/**
 * Get a specific form submission
 * GET /form-submissions/:submissionId
 */
router.get("/:submissionId", authenticate(), getFormSubmission);

/**
 * List all submissions for a specific form event
 * GET /form-submissions/events/:formEventId
 * Query params: page, limit, status, sortBy, sortOrder
 */
router.get("/events/:formEventId/list", authenticate(), listFormSubmissions);

/**
 * Get current user's submissions
 * GET /form-submissions/my-submissions
 * Query params: page, limit, status, sortBy, sortOrder
 */
router.get("/my-submissions/list", authenticate(), listMySubmissions);

/**
 * Get stats for a form event
 * GET /form-submissions/events/:formEventId/stats
 */
router.get("/events/:formEventId/stats", authenticate(), getFormEventStats);

/**
 * Update submission status (admin only)
 * PUT /form-submissions/:submissionId/status
 */
router.put("/:submissionId/status", authenticate(), updateSubmissionStatus);

/**
 * Delete a form submission (admin only)
 * DELETE /form-submissions/:submissionId
 */
router.delete("/:submissionId", authenticate(), deleteFormSubmission);

export default router;
