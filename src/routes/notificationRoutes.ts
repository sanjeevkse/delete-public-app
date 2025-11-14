import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware";
import {
  registerDeviceToken,
  unregisterDeviceToken,
  getDeviceTokens,
  sendNotificationToUser,
  sendNotificationToMultipleUsers,
  sendNotificationToTopic,
  subscribeToTopic,
  unsubscribeFromTopic
} from "../controllers/notificationController";

const router = Router();

// Device token management routes (require authentication)
router.post("/tokens/register", authenticate, registerDeviceToken);
router.post("/tokens/unregister", authenticate, unregisterDeviceToken);
router.get("/tokens", authenticate, getDeviceTokens);

// Topic subscription routes (require authentication)
router.post("/topics/subscribe", authenticate, subscribeToTopic);
router.post("/topics/unsubscribe", authenticate, unsubscribeFromTopic);

// Send notification routes (may require admin permissions - add authorization middleware as needed)
router.post("/send/user", authenticate, sendNotificationToUser);
router.post("/send/users", authenticate, sendNotificationToMultipleUsers);
router.post("/send/topic", authenticate, sendNotificationToTopic);

export default router;
