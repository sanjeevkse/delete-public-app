import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import notificationService from "../services/notificationService";

/**
 * Send notification to users targeted by ward/booth access combinations and role
 */
export const sendTargetedNotification = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = (req.user as any)?.id;
    const { accesses, roleId, title, body, data } = req.body;

    // Validate required fields
    if (!title || !body) {
      res.status(400).json({ success: false, message: "title and body are required" });
      return;
    }

    if (!accesses || !Array.isArray(accesses) || accesses.length === 0) {
      res.status(400).json({
        success: false,
        message:
          "accesses is required and must be a non-empty array of {wardNumberId, boothNumberId} objects"
      });
      return;
    }

    // Validate each access object has at least one field
    const validAccesses = accesses.every(
      (access: any) =>
        (access.wardNumberId !== null && access.wardNumberId !== undefined) ||
        (access.boothNumberId !== null && access.boothNumberId !== undefined)
    );

    if (!validAccesses) {
      res.status(400).json({
        success: false,
        message: "Each access object must have either wardNumberId or boothNumberId (or both)"
      });
      return;
    }

    const response = await notificationService.sendToTargetedUsers(
      {
        title,
        body,
        data: data || {}
      },
      {
        accesses: accesses,
        roleId: roleId || null,
        triggeredBy: userId
      }
    );

    res.status(200).json({
      success: true,
      message: "Targeted notification sent successfully",
      data: {
        successCount: response.successCount,
        failureCount: response.failureCount,
        totalSent: response.successCount + response.failureCount
      }
    });
  } catch (error: unknown) {
    console.error("Error sending targeted notification:", error);
    const message = error instanceof Error ? error.message : "Failed to send targeted notification";
    res.status(500).json({ success: false, message });
  }
};

/**
 * Get targeted notification details by ID
 */
export const getTargetedNotificationDetails = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { targetedLogId } = req.params;

    if (!targetedLogId) {
      res.status(400).json({ success: false, message: "targetedLogId is required" });
      return;
    }

    const { default: TargetedNotificationLog } = await import("../models/TargetedNotificationLog");
    const { default: NotificationLog } = await import("../models/NotificationLog");
    const { default: NotificationRecipient } = await import("../models/NotificationRecipient");

    const targetedLog = await TargetedNotificationLog.findByPk(targetedLogId);

    if (!targetedLog) {
      res.status(404).json({ success: false, message: "Targeted notification log not found" });
      return;
    }

    const notificationLog = await NotificationLog.findByPk(targetedLog.notificationLogId);
    const recipients = await NotificationRecipient.findAll({
      where: { notificationLogId: targetedLog.notificationLogId },
      attributes: ["userId", "status", "errorMessage", "sentAt"],
      raw: true
    });

    const statusCounts = {
      pending: recipients.filter((r: any) => r.status === "pending").length,
      success: recipients.filter((r: any) => r.status === "success").length,
      failed: recipients.filter((r: any) => r.status === "failed").length
    };

    res.status(200).json({
      success: true,
      data: {
        id: targetedLog.id,
        notificationLogId: targetedLog.notificationLogId,
        targetingCriteria: targetedLog.targetingCriteria,
        targetUserCount: targetedLog.targetUserCount,
        notification: {
          title: notificationLog?.title,
          body: notificationLog?.body,
          type: notificationLog?.notificationType,
          sentAt: notificationLog?.sentAt
        },
        deliveryStats: {
          total: recipients.length,
          ...statusCounts,
          successRate: recipients.length > 0 ? (statusCounts.success / recipients.length) * 100 : 0
        },
        recipients: recipients.slice(0, 100) // Limit to 100 for response size
      }
    });
  } catch (error: unknown) {
    console.error("Error getting targeted notification details:", error);
    const message = error instanceof Error ? error.message : "Failed to get details";
    res.status(500).json({ success: false, message });
  }
};
