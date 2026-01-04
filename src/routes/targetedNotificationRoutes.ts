import express from "express";
import {
  sendTargetedNotification,
  getTargetedNotificationDetails
} from "../controllers/targetedNotificationController";
import { authenticate } from "../middlewares/authMiddleware";

const router = express.Router();

/**
 * POST /api/notifications/send/targeted
 * Send notification to users matching ward, booth, and/or role criteria
 * At least one targeting criterion must be specified
 */
router.post("/send/targeted", authenticate, sendTargetedNotification);

/**
 * GET /api/notifications/targeted/:targetedLogId
 * Get details and delivery stats for a targeted notification
 */
router.get("/targeted/:targetedLogId", authenticate, getTargetedNotificationDetails);

export default router;
