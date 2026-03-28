import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import asyncHandler from "../utils/asyncHandler";
import notificationService from "../services/notificationService";
import { validateAccessibles } from "../services/userAccessService";
import {
  resolveGeoUnitIdsForAccessibles,
  resolveUserGeoUnitAccess
} from "../services/userAccessScopeService";
import { ApiError } from "../middlewares/errorHandler";

/**
 * Send notification to users targeted by normalized geo access and role
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

    if (roleId === undefined || roleId === null) {
      res.status(400).json({ success: false, message: "roleId is required" });
      return;
    }

    if (accesses !== undefined && !Array.isArray(accesses)) {
      res.status(400).json({
        success: false,
        message: "accesses must be an array of geo access objects when provided"
      });
      return;
    }

    if (!userId) {
      res.status(400).json({
        success: false,
        message: "Authenticated user required to send targeted notifications"
      });
      return;
    }

    const senderGeoAccess = await resolveUserGeoUnitAccess(userId);
    const senderGeoUnitIds =
      !senderGeoAccess.hasScopeRows || senderGeoAccess.unrestricted
        ? null
        : senderGeoAccess.geoUnitIds;

    let targetGeoUnitIds: number[] | null = senderGeoUnitIds ? [...senderGeoUnitIds] : null;
    const providedAccesses = Array.isArray(accesses) ? accesses : [];
    const sanitizedAccesses = providedAccesses.filter(
      (access: any) => access && typeof access === "object" && Object.keys(access).length > 0
    );

    if (sanitizedAccesses.length > 0) {
      const validatedAccesses = validateAccessibles(sanitizedAccesses);
      const requestedGeoAccess = await resolveGeoUnitIdsForAccessibles(validatedAccesses);

      if (!requestedGeoAccess.unrestricted && requestedGeoAccess.geoUnitIds.length === 0) {
        res.status(400).json({
          success: false,
          message: "One or more accesses do not resolve to any geo units"
        });
        return;
      }

      if (requestedGeoAccess.unrestricted) {
        targetGeoUnitIds = senderGeoUnitIds ? [...senderGeoUnitIds] : null;
      } else {
        targetGeoUnitIds = senderGeoUnitIds
          ? requestedGeoAccess.geoUnitIds.filter((id) => senderGeoUnitIds.includes(id))
          : requestedGeoAccess.geoUnitIds;
      }

      if (targetGeoUnitIds && targetGeoUnitIds.length === 0) {
        res.status(400).json({
          success: false,
          message: "accesses contain values outside your access scope"
        });
        return;
      }
    }

    try {
      const response = await notificationService.sendToTargetedUsers(
        {
          title,
          body,
          data: data || {}
        },
        {
          geoUnitIds: targetGeoUnitIds,
          roleId,
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
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.status).json({ success: false, message: error.message });
        return;
      }
      throw error;
    }
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
