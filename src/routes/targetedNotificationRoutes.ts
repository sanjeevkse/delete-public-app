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
router.post(
  "/send/targeted",
  (req, res, next) => {
    console.log("=== ROUTE HIT: /send/targeted ===");
    console.log("Request URL:", req.url);
    console.log("Request method:", req.method);
    console.log("Headers:", JSON.stringify(req.headers, null, 2));

    // Temporarily bypass auth for testing
    (req as any).user = { id: 4, roles: ["Public"], permissions: ["*"] };
    next();
  },
  sendTargetedNotification
);

/**
 * GET /api/notifications/targeted/:targetedLogId
 * Get details and delivery stats for a targeted notification
 */
router.get("/targeted/:targetedLogId", authenticate, getTargetedNotificationDetails);

export default router;
