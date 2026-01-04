import express from "express";
import {
  getNotificationDeliveryStatus,
  getUserNotificationStatus,
  getNotificationDeliverySummary,
  getUserFailedNotifications
} from "../controllers/notificationRecipientController";
import { authenticate } from "../middlewares/authMiddleware";

const router = express.Router();

/**
 * GET /api/notifications/:notificationLogId/delivery-status
 * Get detailed delivery status for a notification log (all recipients)
 */
router.get("/:notificationLogId/delivery-status", authenticate, getNotificationDeliveryStatus);

/**
 * GET /api/notifications/:notificationLogId/user-status
 * Get delivery status for a specific user for a notification
 * Query params: userId
 */
router.get("/:notificationLogId/user-status", authenticate, getUserNotificationStatus);

/**
 * GET /api/notifications/delivery/summary
 * Get aggregate delivery summary with filters
 * Query params: startDate, endDate, notificationType, status
 */
router.get("/delivery/summary", authenticate, getNotificationDeliverySummary);

/**
 * GET /api/notifications/users/:userId/failed
 * Get all failed notifications for a specific user
 * Query params: limit, offset
 */
router.get("/users/:userId/failed", authenticate, getUserFailedNotifications);

export default router;
