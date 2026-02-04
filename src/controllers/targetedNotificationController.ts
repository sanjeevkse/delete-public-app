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

    if (roleId === undefined || roleId === null) {
      res.status(400).json({ success: false, message: "roleId is required" });
      return;
    }

    if (accesses !== undefined && !Array.isArray(accesses)) {
      res.status(400).json({
        success: false,
        message: "accesses must be an array of {wardNumberId, boothNumberId} objects when provided"
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

    const userAccessList = await getUserAccessList(userId);
    console.log("User access list:", JSON.stringify(userAccessList, null, 2));
    const senderAccesses = userAccessList
      .map((access) => ({
        wardNumberId: access.wardNumberId ?? null,
        boothNumberId: access.boothNumberId ?? null
      }))
      .filter(
        (access) =>
          (access.wardNumberId !== null && access.wardNumberId !== undefined) ||
          (access.boothNumberId !== null && access.boothNumberId !== undefined)
      );

    const normalizedSenderAccesses =
      senderAccesses.length > 0 ? senderAccesses : [{ wardNumberId: -1, boothNumberId: -1 }];
    console.log("Normalized sender accesses:", JSON.stringify(normalizedSenderAccesses, null, 2));

    let effectiveAccesses = accesses;
    const providedAccesses = Array.isArray(accesses) ? accesses : [];
    const sanitizedAccesses = providedAccesses.filter(
      (access: any) =>
        (access?.wardNumberId !== null && access?.wardNumberId !== undefined) ||
        (access?.boothNumberId !== null && access?.boothNumberId !== undefined)
    );
    const hasProvidedAccesses = sanitizedAccesses.length > 0;

    if (!hasProvidedAccesses) {
      effectiveAccesses = normalizedSenderAccesses;
    } else {
      const isSpecific = (value: number | null | undefined): boolean =>
        value !== null && value !== undefined && value !== -1;

      const intersection: Array<{ wardNumberId?: number | null; boothNumberId?: number | null }> =
        [];

      for (const requested of sanitizedAccesses) {
        console.log("Requested access:", JSON.stringify(requested, null, 2));
        const requestedWard = requested?.wardNumberId ?? null;
        const requestedBooth = requested?.boothNumberId ?? null;

        const matches = normalizedSenderAccesses.filter((access) => {
          const wardMatch =
            !isSpecific(requestedWard) ||
            access.wardNumberId === -1 ||
            access.wardNumberId === requestedWard;
          const boothMatch =
            !isSpecific(requestedBooth) ||
            access.boothNumberId === -1 ||
            access.boothNumberId === requestedBooth;
          return wardMatch && boothMatch;
        });
        console.log("Matched sender accesses:", JSON.stringify(matches, null, 2));

        if (matches.length === 0) {
          res.status(400).json({
            success: false,
            message: "accesses contain values outside your access scope"
          });
          return;
        }

        for (const match of matches) {
          const wardNumberId = isSpecific(requestedWard) ? requestedWard : match.wardNumberId;
          const boothNumberId = isSpecific(requestedBooth) ? requestedBooth : match.boothNumberId;
          intersection.push({ wardNumberId, boothNumberId });
        }
      }

      const unique = new Map<
        string,
        { wardNumberId?: number | null; boothNumberId?: number | null }
      >();
      for (const access of intersection) {
        const key = `${access.wardNumberId ?? "null"}:${access.boothNumberId ?? "null"}`;
        unique.set(key, access);
      }

      effectiveAccesses = Array.from(unique.values());
    }
    console.log("Effective accesses:", JSON.stringify(effectiveAccesses, null, 2));

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
