import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import asyncHandler from "../utils/asyncHandler";
import notificationService from "../services/notificationService";
import { getUserAccessList } from "../services/userAccessibilityService";

/**
 * Send notification to users targeted by ward/booth access combinations and role
 */
export const sendTargetedNotification = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    console.log("=== TARGETED NOTIFICATION ENDPOINT HIT ===");
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    console.log("User ID:", (req.user as any)?.id);

    const userId = (req.user as any)?.id;
    const { accesses, roleId, title, body, data } = req.body;

    // Validate required fields
    if (!title || !body) {
      res.status(400).json({ success: false, message: "title and body are required" });
      return;
    }

    if (accesses !== undefined && (!Array.isArray(accesses) || accesses.length === 0)) {
      // If accesses is provided, it must be a non-empty array
      // Empty array is treated as not provided and will fallback to user access list
      if (!Array.isArray(accesses)) {
        res.status(400).json({
          success: false,
          message:
            "accesses must be an array of {wardNumberId, boothNumberId} objects when provided"
        });
        return;
      }
    }

    let effectiveAccesses = accesses;
    const hasProvidedAccesses = Array.isArray(accesses) && accesses.length > 0;

    if (!hasProvidedAccesses) {
      if (!userId) {
        res.status(400).json({
          success: false,
          message: "Authenticated user required when accesses is not provided"
        });
        return;
      }

      const userAccessList = await getUserAccessList(userId);
      const mappedAccesses = userAccessList
        .map((access) => ({
          wardNumberId: access.wardNumberId ?? null,
          boothNumberId: access.boothNumberId ?? null
        }))
        .filter(
          (access) =>
            (access.wardNumberId !== null && access.wardNumberId !== undefined) ||
            (access.boothNumberId !== null && access.boothNumberId !== undefined)
        );

      // If user has no access list, treat as access to all
      effectiveAccesses =
        mappedAccesses.length > 0 ? mappedAccesses : [{ wardNumberId: -1, boothNumberId: -1 }];
    }

    if (!effectiveAccesses || !Array.isArray(effectiveAccesses) || effectiveAccesses.length === 0) {
      res.status(400).json({
        success: false,
        message:
          "accesses must be provided or derived from user access list and contain at least one entry"
      });
      return;
    }

    // Validate each access object has at least one field
    const validAccesses = effectiveAccesses.every(
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
        accesses: effectiveAccesses,
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
  }
);

/**
 * Get targeted notification details by ID
 */
export const getTargetedNotificationDetails = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { targetedLogId } = req.params;

      if (!targetedLogId) {
        res.status(400).json({ success: false, message: "targetedLogId is required" });
        return;
      }

      const { default: TargetedNotificationLog } = await import(
        "../models/TargetedNotificationLog"
      );
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
          wardNumberId: targetedLog.wardNumberId,
          boothNumberId: targetedLog.boothNumberId,
          roleId: targetedLog.roleId,
          notification: {
            title: notificationLog?.title,
            body: notificationLog?.body,
            type: notificationLog?.notificationType,
            sentAt: notificationLog?.sentAt
          },
          deliveryStats: {
            total: recipients.length,
            ...statusCounts,
            successRate:
              recipients.length > 0 ? (statusCounts.success / recipients.length) * 100 : 0
          },
          recipients: recipients.slice(0, 100) // Limit to 100 for response size
        }
      });
    } catch (error: unknown) {
      console.error("Error getting targeted notification details:", error);
      const message = error instanceof Error ? error.message : "Failed to get details";
      res.status(500).json({ success: false, message });
    }
  }
);
