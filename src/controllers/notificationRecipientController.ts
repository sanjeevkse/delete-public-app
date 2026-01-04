import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import NotificationLog from "../models/NotificationLog";
import NotificationRecipient from "../models/NotificationRecipient";
import { Op } from "sequelize";

/**
 * Get notification delivery status for a specific notification log
 */
export const getNotificationDeliveryStatus = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { notificationLogId } = req.params;

    if (!notificationLogId) {
      res.status(400).json({ success: false, message: "notificationLogId is required" });
      return;
    }

    const log = await NotificationLog.findByPk(notificationLogId);

    if (!log) {
      res.status(404).json({ success: false, message: "Notification log not found" });
      return;
    }

    const recipients = await NotificationRecipient.findAll({
      where: { notificationLogId: parseInt(notificationLogId) },
      attributes: ["id", "userId", "deviceTokenId", "status", "errorMessage", "sentAt"],
      order: [["createdAt", "DESC"]]
    });

    const statusCounts = {
      pending: recipients.filter((r: any) => r.status === "pending").length,
      success: recipients.filter((r: any) => r.status === "success").length,
      failed: recipients.filter((r: any) => r.status === "failed").length
    };

    res.status(200).json({
      success: true,
      data: {
        notificationLog: {
          id: log.id,
          type: log.notificationType,
          title: log.title,
          sentAt: log.sentAt,
          status: log.status
        },
        summary: {
          total: recipients.length,
          ...statusCounts,
          successRate: recipients.length > 0 ? (statusCounts.success / recipients.length) * 100 : 0
        },
        recipients: recipients.map((r: any) => ({
          id: r.id,
          userId: r.userId,
          deviceTokenId: r.deviceTokenId,
          status: r.status,
          errorMessage: r.errorMessage,
          sentAt: r.sentAt
        }))
      }
    });
  } catch (error: unknown) {
    console.error("Error getting notification delivery status:", error);
    const message = error instanceof Error ? error.message : "Failed to get delivery status";
    res.status(500).json({ success: false, message });
  }
};

/**
 * Get notification delivery status for a specific user
 */
export const getUserNotificationStatus = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { notificationLogId } = req.params;
    const { userId } = req.query;

    if (!notificationLogId) {
      res.status(400).json({ success: false, message: "notificationLogId is required" });
      return;
    }

    if (!userId) {
      res.status(400).json({ success: false, message: "userId is required" });
      return;
    }

    const recipient = await NotificationRecipient.findOne({
      where: {
        notificationLogId: parseInt(notificationLogId),
        userId: parseInt(userId as string)
      },
      attributes: ["id", "userId", "deviceTokenId", "status", "errorMessage", "fcmResponse", "sentAt", "createdAt"]
    });

    if (!recipient) {
      res.status(404).json({
        success: false,
        message: "Notification recipient record not found"
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        id: recipient.id,
        userId: recipient.userId,
        deviceTokenId: recipient.deviceTokenId,
        status: recipient.status,
        errorMessage: recipient.errorMessage,
        fcmResponse: recipient.fcmResponse,
        sentAt: recipient.sentAt,
        recordedAt: recipient.createdAt
      }
    });
  } catch (error: unknown) {
    console.error("Error getting user notification status:", error);
    const message = error instanceof Error ? error.message : "Failed to get user notification status";
    res.status(500).json({ success: false, message });
  }
};

/**
 * Get notification delivery summary (aggregate statistics)
 */
export const getNotificationDeliverySummary = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { startDate, endDate, notificationType, status } = req.query;

    // Build where clause for logs
    const logWhere: any = {};
    if (startDate || endDate) {
      logWhere.sentAt = {};
      if (startDate) {
        logWhere.sentAt[Op.gte] = new Date(startDate as string);
      }
      if (endDate) {
        logWhere.sentAt[Op.lte] = new Date(endDate as string);
      }
    }
    if (notificationType) {
      logWhere.notificationType = notificationType;
    }

    const logs = await NotificationLog.findAll({
      where: logWhere,
      attributes: ["id", "notificationType", "title", "recipientCount", "successCount", "failureCount", "sentAt"],
      order: [["sentAt", "DESC"]]
    });

    // Build where clause for recipients
    const recipientWhere: any = {};
    if (status && typeof status === "string") {
      recipientWhere.status = status as "pending" | "success" | "failed";
    }

    // Get recipient status breakdown
    const recipients = await NotificationRecipient.findAll({
      where: recipientWhere,
      attributes: [
        "notificationLogId",
        "status",
        [require("sequelize").fn("COUNT", require("sequelize").col("id")), "count"]
      ],
      group: ["notificationLogId", "status"],
      raw: true
    });

    // Map recipients by log id for easier lookup
    const recipientMap = new Map();
    recipients.forEach((r: any) => {
      if (!recipientMap.has(r.notificationLogId)) {
        recipientMap.set(r.notificationLogId, {});
      }
      recipientMap.get(r.notificationLogId)[r.status] = r.count;
    });

    // Build response with enriched data
    const enrichedLogs = logs.map((log: any) => {
      const breakdown = recipientMap.get(log.id) || {};
      return {
        id: log.id,
        type: log.notificationType,
        title: log.title,
        sentAt: log.sentAt,
        targetedCount: log.recipientCount,
        successCount: log.successCount,
        failureCount: log.failureCount,
        successRate: log.recipientCount > 0 ? (log.successCount / log.recipientCount) * 100 : 0,
        detailedBreakdown: {
          pending: breakdown.pending || 0,
          success: breakdown.success || 0,
          failed: breakdown.failed || 0
        }
      };
    });

    // Calculate overall statistics
    const totalNotifications = logs.length;
    const totalTargeted = logs.reduce((sum: number, l: any) => sum + l.recipientCount, 0);
    const totalSuccessful = logs.reduce((sum: number, l: any) => sum + l.successCount, 0);
    const totalFailed = logs.reduce((sum: number, l: any) => sum + l.failureCount, 0);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalNotifications,
          totalTargeted,
          totalSuccessful,
          totalFailed,
          overallSuccessRate: totalTargeted > 0 ? (totalSuccessful / totalTargeted) * 100 : 0
        },
        notifications: enrichedLogs
      }
    });
  } catch (error: unknown) {
    console.error("Error getting notification delivery summary:", error);
    const message = error instanceof Error ? error.message : "Failed to get delivery summary";
    res.status(500).json({ success: false, message });
  }
};

/**
 * Get failed notifications for a user
 */
export const getUserFailedNotifications = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    if (!userId) {
      res.status(400).json({ success: false, message: "userId is required" });
      return;
    }

    const failedRecipients = await NotificationRecipient.findAll({
      where: {
        userId: parseInt(userId),
        status: "failed"
      },
      attributes: ["id", "notificationLogId", "status", "errorMessage", "sentAt"],
      order: [["sentAt", "DESC"]],
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });

    const totalCount = await NotificationRecipient.count({
      where: {
        userId: parseInt(userId),
        status: "failed"
      }
    });

    // Get associated notification logs
    const logIds = failedRecipients.map((r: any) => r.notificationLogId);
    const logs = await NotificationLog.findAll({
      where: { id: logIds },
      attributes: ["id", "notificationType", "title", "body"],
      raw: true
    });

    const logMap = new Map(logs.map((l: any) => [l.id, l]));

    const enrichedData = failedRecipients.map((r: any) => ({
      recipientId: r.id,
      notificationLogId: r.notificationLogId,
      errorMessage: r.errorMessage,
      sentAt: r.sentAt,
      notification: logMap.get(r.notificationLogId)
    }));

    res.status(200).json({
      success: true,
      data: {
        total: totalCount,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        failedNotifications: enrichedData
      }
    });
  } catch (error: unknown) {
    console.error("Error getting user failed notifications:", error);
    const message = error instanceof Error ? error.message : "Failed to get failed notifications";
    res.status(500).json({ success: false, message });
  }
};
