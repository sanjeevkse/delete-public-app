import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware";
import {
  registerDeviceToken,
  unregisterDeviceToken,
  getDeviceTokens,
  sendNotificationToUser,
  sendNotificationToMultipleUsers,
  sendNotificationToTopic,
  sendBroadcastNotification,
  subscribeToTopic,
  unsubscribeFromTopic
} from "../controllers/notificationController";

const router = Router();

// Device token management routes (AUTHENTICATED)
router.post("/tokens/register", authenticate(), registerDeviceToken);
router.post("/tokens/unregister", authenticate(), unregisterDeviceToken);
router.get("/tokens", authenticate(), getDeviceTokens);

// Topic subscription routes (AUTHENTICATED)
router.post("/topics/subscribe", authenticate(), subscribeToTopic);
router.post("/topics/unsubscribe", authenticate(), unsubscribeFromTopic);

// Send notification routes (AUTHENTICATED - Admin recommended)
router.post("/send/user", authenticate(), sendNotificationToUser);
router.post("/send/users", authenticate(), sendNotificationToMultipleUsers);
router.post("/send/topic", authenticate(), sendNotificationToTopic);
router.post("/send/broadcast", authenticate(), sendBroadcastNotification);

export default router;
