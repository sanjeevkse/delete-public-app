import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import DeviceToken from "../models/DeviceToken";
import notificationService from "../services/notificationService";
import { Op } from "sequelize";

/**
 * Register FCM token for the authenticated user (Mobile App)
 * This should be called when:
 * - User logs in
 * - App starts and user is already logged in
 * - FCM token is refreshed
 */
export const registerDeviceToken = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = (req.user as any)?.id || req.body.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const { token, deviceId, platform } = req.body;

    if (!token) {
      res.status(400).json({ success: false, message: "FCM token is required" });
      return;
    }

    // Validate platform
    if (platform && !["ios", "android", "web"].includes(platform)) {
      res.status(400).json({ success: false, message: "Platform must be ios, android, or web" });
      return;
    }

    // Check if token already exists
    let deviceToken = await DeviceToken.findOne({ where: { token } });

    if (deviceToken) {
      // Update existing token (might have changed userId/device)
      await deviceToken.update({
        userId,
        deviceId: deviceId || deviceToken.deviceId,
        platform: platform || deviceToken.platform,
        isActive: true,
        lastUsedAt: new Date(),
        updatedBy: userId
      });
    } else {
      // Create new token
      deviceToken = await DeviceToken.create({
        userId,
        token,
        deviceId: deviceId || null,
        platform: platform || null,
        isActive: true,
        lastUsedAt: new Date(),
        status: 1,
        createdBy: userId,
        updatedBy: userId
      });
    }

    res.status(200).json({
      success: true,
      message: "Device registered successfully",
      data: {
        id: deviceToken.id,
        platform: deviceToken.platform,
        registeredAt: deviceToken.createdAt
      }
    });
  } catch (error: unknown) {
    console.error("Error registering device token:", error);
    const message = error instanceof Error ? error.message : "Failed to register device token";
    res.status(500).json({ success: false, message });
  }
};

/**
 * Unregister a device token
 */
export const unregisterDeviceToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, token } = req.body;

    if (!userId) {
      res.status(400).json({ success: false, message: "userId is required" });
      return;
    }

    if (!token) {
      res.status(400).json({ success: false, message: "Token is required" });
      return;
    }

    await DeviceToken.update({ isActive: false, updatedBy: userId }, { where: { userId, token } });

    res.status(200).json({
      success: true,
      message: "Device token unregistered successfully"
    });
  } catch (error: unknown) {
    console.error("Error unregistering device token:", error);
    const message = error instanceof Error ? error.message : "Failed to unregister device token";
    res.status(500).json({ success: false, message });
  }
};

/**
 * Get all device tokens for the current user
 */
export const getDeviceTokens = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.query;

    if (!userId) {
      res.status(400).json({ success: false, message: "userId is required" });
      return;
    }

    const tokens = await DeviceToken.findAll({
      where: { userId: Number(userId), isActive: true },
      attributes: ["id", "deviceId", "platform", "lastUsedAt", "createdAt"]
    });

    res.status(200).json({
      success: true,
      data: tokens
    });
  } catch (error: unknown) {
    console.error("Error fetching device tokens:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch device tokens";
    res.status(500).json({ success: false, message });
  }
};

/**
 * Send a push notification to a single user
 */
export const sendNotificationToUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, title, body, data, imageUrl } = req.body;

    if (!userId || !title || !body) {
      res.status(400).json({
        success: false,
        message: "userId, title, and body are required"
      });
      return;
    }

    // Get all active tokens for the user
    const deviceTokens = await DeviceToken.findAll({
      where: { userId, isActive: true }
    });

    if (deviceTokens.length === 0) {
      res.status(404).json({
        success: false,
        message: "No active device tokens found for this user"
      });
      return;
    }

    const tokens = deviceTokens.map((dt) => dt.token);

    // Send notification to all devices
    const result = await notificationService.sendToMultipleDevices({
      tokens,
      notification: { title, body, data, imageUrl }
    });

    // Update lastUsedAt for successful tokens
    await DeviceToken.update({ lastUsedAt: new Date() }, { where: { userId, isActive: true } });

    res.status(200).json({
      success: true,
      message: "Notification sent successfully",
      data: {
        successCount: result.successCount,
        failureCount: result.failureCount
      }
    });
  } catch (error: unknown) {
    console.error("Error sending notification:", error);
    const message = error instanceof Error ? error.message : "Failed to send notification";
    res.status(500).json({ success: false, message });
  }
};

/**
 * Send a push notification to multiple users
 */
export const sendNotificationToMultipleUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userIds, title, body, data, imageUrl } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0 || !title || !body) {
      res.status(400).json({
        success: false,
        message: "userIds (array), title, and body are required"
      });
      return;
    }

    // Get all active tokens for the users
    const deviceTokens = await DeviceToken.findAll({
      where: {
        userId: { [Op.in]: userIds },
        isActive: true
      }
    });

    if (deviceTokens.length === 0) {
      res.status(404).json({
        success: false,
        message: "No active device tokens found for these users"
      });
      return;
    }

    const tokens = deviceTokens.map((dt) => dt.token);

    // Send notification to all devices
    const result = await notificationService.sendToMultipleDevices({
      tokens,
      notification: { title, body, data, imageUrl }
    });

    // Update lastUsedAt for successful tokens
    await DeviceToken.update(
      { lastUsedAt: new Date() },
      { where: { userId: { [Op.in]: userIds }, isActive: true } }
    );

    res.status(200).json({
      success: true,
      message: "Notifications sent successfully",
      data: {
        successCount: result.successCount,
        failureCount: result.failureCount
      }
    });
  } catch (error: unknown) {
    console.error("Error sending notifications:", error);
    const message = error instanceof Error ? error.message : "Failed to send notifications";
    res.status(500).json({ success: false, message });
  }
};

/**
 * Send a push notification to a topic
 */
export const sendNotificationToTopic = async (req: Request, res: Response): Promise<void> => {
  try {
    const { topic, title, body, data, imageUrl } = req.body;

    if (!topic || !title || !body) {
      res.status(400).json({
        success: false,
        message: "topic, title, and body are required"
      });
      return;
    }

    const result = await notificationService.sendToTopic(topic, {
      title,
      body,
      data,
      imageUrl
    });

    res.status(200).json({
      success: true,
      message: "Notification sent to topic successfully",
      data: { messageId: result }
    });
  } catch (error: unknown) {
    console.error("Error sending notification to topic:", error);
    const message = error instanceof Error ? error.message : "Failed to send notification to topic";
    res.status(500).json({ success: false, message });
  }
};

/**
 * Subscribe user to a topic
 */
export const subscribeToTopic = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, topic } = req.body;

    if (!userId) {
      res.status(400).json({ success: false, message: "userId is required" });
      return;
    }

    if (!topic) {
      res.status(400).json({ success: false, message: "topic is required" });
      return;
    }

    // Get all active tokens for the user
    const deviceTokens = await DeviceToken.findAll({
      where: { userId, isActive: true }
    });

    if (deviceTokens.length === 0) {
      res.status(404).json({
        success: false,
        message: "No active device tokens found"
      });
      return;
    }

    const tokens = deviceTokens.map((dt) => dt.token);
    await notificationService.subscribeToTopic(tokens, topic);

    res.status(200).json({
      success: true,
      message: `Successfully subscribed to topic: ${topic}`
    });
  } catch (error: unknown) {
    console.error("Error subscribing to topic:", error);
    const message = error instanceof Error ? error.message : "Failed to subscribe to topic";
    res.status(500).json({ success: false, message });
  }
};

/**
 * Unsubscribe user from a topic
 */
export const unsubscribeFromTopic = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, topic } = req.body;

    if (!userId) {
      res.status(400).json({ success: false, message: "userId is required" });
      return;
    }

    if (!topic) {
      res.status(400).json({ success: false, message: "topic is required" });
      return;
    }

    // Get all active tokens for the user
    const deviceTokens = await DeviceToken.findAll({
      where: { userId, isActive: true }
    });

    if (deviceTokens.length === 0) {
      res.status(404).json({
        success: false,
        message: "No active device tokens found"
      });
      return;
    }

    const tokens = deviceTokens.map((dt) => dt.token);
    await notificationService.unsubscribeFromTopic(tokens, topic);

    res.status(200).json({
      success: true,
      message: `Successfully unsubscribed from topic: ${topic}`
    });
  } catch (error: unknown) {
    console.error("Error unsubscribing from topic:", error);
    const message = error instanceof Error ? error.message : "Failed to unsubscribe from topic";
    res.status(500).json({ success: false, message });
  }
};

/**
 * Send broadcast notification to all active users
 * Typically used for important announcements, new schemes, etc.
 */
export const sendBroadcastNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, body, data, imageUrl } = req.body;

    if (!title || !body) {
      res.status(400).json({
        success: false,
        message: "title and body are required"
      });
      return;
    }

    // TODO: Add admin role check here
    // const user = req.user as any;
    // if (!user?.role || user.role !== 'admin') {
    //   res.status(403).json({ success: false, message: "Only admins can send broadcast notifications" });
    //   return;
    // }

    const result = await notificationService.sendToAllUsers({
      title,
      body,
      data,
      imageUrl
    });

    res.status(200).json({
      success: true,
      message: "Broadcast notification sent successfully",
      data: {
        successCount: result.successCount,
        failureCount: result.failureCount,
        totalSent: result.successCount + result.failureCount
      }
    });
  } catch (error: unknown) {
    console.error("Error sending broadcast notification:", error);
    const message =
      error instanceof Error ? error.message : "Failed to send broadcast notification";
    res.status(500).json({ success: false, message });
  }
};

/**
 * Get notifications for the authenticated user with pagination
 */
export const getUserNotifications = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = (req.user as any)?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const { default: NotificationRecipient } = await import("../models/NotificationRecipient");
    const { default: NotificationLog } = await import("../models/NotificationLog");
    const { default: TargetedNotificationLog } = await import("../models/TargetedNotificationLog");

    // Get paginated notifications for the user
    const { count, rows: recipients } = await NotificationRecipient.findAndCountAll({
      where: { userId },
      attributes: ["id", "notificationLogId", "status", "sentAt", "errorMessage"],
      include: [
        {
          model: NotificationLog,
          attributes: [
            "id",
            "notificationType",
            "entityType",
            "entityId",
            "title",
            "body",
            "dataJson",
            "createdAt"
          ]
        }
      ],
      order: [["sentAt", "DESC"]],
      limit,
      offset,
      raw: false,
      subQuery: false
    });

    // Get targeted notification logs for context
    const notificationIds = recipients.map((r: any) => r.notificationLogId);
    const targetedLogs = await TargetedNotificationLog.findAll({
      where: { notificationLogId: notificationIds },
      attributes: ["notificationLogId", "wardNumberId", "boothNumberId", "roleId"],
      raw: true
    });

    const targetedLogsMap = new Map(targetedLogs.map((t: any) => [t.notificationLogId, t]));

    // Format response
    const notifications = recipients.map((recipient: any) => {
      const notifLog = recipient.NotificationLog;
      const targeted = targetedLogsMap.get(notifLog.id);

      return {
        recipientId: recipient.id,
        notificationId: notifLog.id,
        type: notifLog.notificationType,
        entityType: notifLog.entityType,
        entityId: notifLog.entityId,
        title: notifLog.title,
        body: notifLog.body,
        data: notifLog.dataJson,
        status: recipient.status,
        sentAt: recipient.sentAt,
        createdAt: notifLog.createdAt,
        isTargeted: !!targeted,
        targetingInfo: targeted || null,
        errorMessage: recipient.errorMessage
      };
    });

    res.status(200).json({
      success: true,
      data: {
        notifications,
        pagination: {
          total: count,
          page,
          limit,
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error: unknown) {
    console.error("Error fetching user notifications:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch notifications";
    res.status(500).json({ success: false, message });
  }
};
