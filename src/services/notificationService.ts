import { getMessaging } from "../config/firebase";
import type { Message, MulticastMessage, BatchResponse } from "firebase-admin/messaging";
import logger from "../utils/logger";

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

export interface SendNotificationOptions {
  token: string;
  notification: NotificationPayload;
  priority?: "high" | "normal";
}

export interface SendMulticastOptions {
  tokens: string[];
  notification: NotificationPayload;
  priority?: "high" | "normal";
}

class NotificationService {
  /**
   * Send a push notification to a single device
   */
  async sendToDevice(options: SendNotificationOptions): Promise<string> {
    try {
      const messaging = getMessaging();

      const message: Message = {
        token: options.token,
        notification: {
          title: options.notification.title,
          body: options.notification.body,
          ...(options.notification.imageUrl && { imageUrl: options.notification.imageUrl })
        },
        ...(options.notification.data && { data: options.notification.data }),
        android: {
          priority: options.priority ?? "high",
          notification: {
            sound: "default",
            clickAction: "FLUTTER_NOTIFICATION_CLICK"
          }
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1
            }
          }
        }
      };

      const response = await messaging.send(message);
      logger.info({ response }, "Successfully sent notification");
      return response;
    } catch (error) {
      logger.error({ err: error }, "Error sending notification");
      throw error;
    }
  }

  /**
   * Send push notifications to multiple devices
   */
  async sendToMultipleDevices(options: SendMulticastOptions): Promise<BatchResponse> {
    try {
      const messaging = getMessaging();

      const message: MulticastMessage = {
        tokens: options.tokens,
        notification: {
          title: options.notification.title,
          body: options.notification.body,
          ...(options.notification.imageUrl && { imageUrl: options.notification.imageUrl })
        },
        ...(options.notification.data && { data: options.notification.data }),
        android: {
          priority: options.priority ?? "high",
          notification: {
            sound: "default",
            clickAction: "FLUTTER_NOTIFICATION_CLICK"
          }
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1
            }
          }
        }
      };

      const response = await messaging.sendEachForMulticast(message);
      logger.info({ successCount: response.successCount }, "Multicast notification sent");
      if (response.failureCount > 0) {
        logger.warn({ failureCount: response.failureCount }, "Some multicast notifications failed");
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            logger.error(
              { token: options.tokens[idx], error: resp.error },
              "Failed to send to token"
            );
          }
        });
      }
      return response;
    } catch (error) {
      logger.error({ err: error }, "Error sending multicast notification");
      throw error;
    }
  }

  /**
   * Send a notification to a topic
   */
  async sendToTopic(topic: string, notification: NotificationPayload): Promise<string> {
    try {
      const messaging = getMessaging();

      const message: Message = {
        topic,
        notification: {
          title: notification.title,
          body: notification.body,
          ...(notification.imageUrl && { imageUrl: notification.imageUrl })
        },
        ...(notification.data && { data: notification.data }),
        android: {
          priority: "high",
          notification: {
            sound: "default",
            clickAction: "FLUTTER_NOTIFICATION_CLICK"
          }
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1
            }
          }
        }
      };

      const response = await messaging.send(message);
      logger.info({ topic, response }, "Successfully sent notification to topic");
      return response;
    } catch (error) {
      logger.error({ topic, err: error }, "Error sending notification to topic");
      throw error;
    }
  }

  /**
   * Subscribe tokens to a topic
   */
  async subscribeToTopic(tokens: string[], topic: string): Promise<void> {
    try {
      const messaging = getMessaging();
      const response = await messaging.subscribeToTopic(tokens, topic);
      logger.info({ topic, successCount: response.successCount }, "Tokens subscribed to topic");
      if (response.failureCount > 0) {
        logger.warn(
          { topic, failureCount: response.failureCount },
          "Failed to subscribe some tokens"
        );
      }
    } catch (error) {
      logger.error({ topic, err: error }, "Error subscribing to topic");
      throw error;
    }
  }

  /**
   * Unsubscribe tokens from a topic
   */
  async unsubscribeFromTopic(tokens: string[], topic: string): Promise<void> {
    try {
      const messaging = getMessaging();
      const response = await messaging.unsubscribeFromTopic(tokens, topic);
      logger.info({ topic, successCount: response.successCount }, "Tokens unsubscribed from topic");
      if (response.failureCount > 0) {
        logger.warn(
          { topic, failureCount: response.failureCount },
          "Failed to unsubscribe some tokens"
        );
      }
    } catch (error) {
      logger.error({ topic, err: error }, "Error unsubscribing from topic");
      throw error;
    }
  }

  /**
   * Send notification to all active users
   * Fetches all active device tokens from database and sends broadcast
   * Tracks individual recipient delivery status
   */
  async sendToAllUsers(
    notification: NotificationPayload,
    options?: {
      notificationType?: string;
      entityType?: string;
      entityId?: number;
      triggeredBy?: number;
    }
  ): Promise<BatchResponse> {
    const startTime = Date.now();
    let logId: number | null = null;

    try {
      logger.info({ title: notification.title }, "sendToAllUsers called with notification");

      // Import models
      const { default: DeviceToken } = await import("../models/DeviceToken");
      const { default: NotificationLog } = await import("../models/NotificationLog");
      const { default: NotificationRecipient } = await import("../models/NotificationRecipient");

      // Get all active device tokens with user info
      const deviceTokens = await DeviceToken.findAll({
        where: { isActive: true, status: 1 },
        attributes: ["id", "userId", "token"]
      });

      logger.info({ count: deviceTokens.length }, "Active device tokens found");

      if (deviceTokens.length === 0) {
        // Log failed attempt
        await NotificationLog.create({
          notificationType: options?.notificationType || "broadcast",
          entityType: options?.entityType || null,
          entityId: options?.entityId || null,
          title: notification.title,
          body: notification.body,
          dataJson: notification.data || null,
          recipientCount: 0,
          successCount: 0,
          failureCount: 0,
          errorMessage: "No active device tokens found",
          triggeredBy: options?.triggeredBy || null,
          status: 1
        });

        logger.warn("No active device tokens found - cannot send notifications");
        throw new Error("No active device tokens found");
      }

      const tokens = deviceTokens.map((dt) => dt.token);

      // Create initial log entry
      const notificationLog = await NotificationLog.create({
        notificationType: options?.notificationType || "broadcast",
        entityType: options?.entityType || null,
        entityId: options?.entityId || null,
        title: notification.title,
        body: notification.body,
        dataJson: notification.data || null,
        recipientCount: tokens.length,
        successCount: 0,
        failureCount: 0,
        triggeredBy: options?.triggeredBy || null,
        status: 1
      });

      logId = notificationLog.id;

      // Create pending recipient entries for all users
      const recipientEntries = deviceTokens.map((dt) => ({
        notificationLogId: logId,
        userId: dt.userId,
        deviceTokenId: dt.id,
        status: "pending" as const,
        sentAt: new Date()
      }));

      await NotificationRecipient.bulkCreate(recipientEntries);

      // Firebase has limit of 500 tokens per batch
      // Split into chunks if needed
      const BATCH_SIZE = 500;
      const results: BatchResponse[] = [];
      const tokenIndexMap = new Map(deviceTokens.map((dt, idx) => [dt.token, idx]));

      for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
        const batch = tokens.slice(i, i + BATCH_SIZE);
        const batchDeviceTokens = batch.map(t => deviceTokens[tokenIndexMap.get(t)!]);
        
        const response = await this.sendToMultipleDevices({
          tokens: batch,
          notification
        });

        // Update recipient status based on response
        for (let j = 0; j < response.responses.length; j++) {
          const resp = response.responses[j];
          const deviceToken = batchDeviceTokens[j];
          
          if (resp.success) {
            await NotificationRecipient.update(
              {
                status: "success",
                fcmResponse: resp.messageId ? { messageId: resp.messageId } : null
              },
              {
                where: {
                  notificationLogId: logId,
                  deviceTokenId: deviceToken.id
                }
              }
            );
          } else {
            await NotificationRecipient.update(
              {
                status: "failed",
                errorMessage: resp.error?.message || "Unknown error",
                fcmResponse: resp.error ? { code: resp.error.code, message: resp.error.message } : null
              },
              {
                where: {
                  notificationLogId: logId,
                  deviceTokenId: deviceToken.id
                }
              }
            );
          }
        }

        results.push(response);
      }

      // Aggregate results
      const totalSuccess = results.reduce((sum, r) => sum + r.successCount, 0);
      const totalFailure = results.reduce((sum, r) => sum + r.failureCount, 0);

      // Update log with results
      if (logId) {
        const { default: NotificationLog } = await import("../models/NotificationLog");
        await NotificationLog.update(
          {
            successCount: totalSuccess,
            failureCount: totalFailure,
            fcmResponse: {
              batches: results.length,
              duration: Date.now() - startTime,
              results: results.map((r) => ({
                successCount: r.successCount,
                failureCount: r.failureCount
              }))
            }
          },
          { where: { id: logId } }
        );
      }

      logger.info(
        { successCount: totalSuccess, failureCount: totalFailure, totalTokens: tokens.length },
        "Broadcast notification sent"
      );

      return {
        successCount: totalSuccess,
        failureCount: totalFailure,
        responses: results.flatMap((r) => r.responses)
      };
    } catch (error) {
      // Update log with error if we have a logId
      if (logId) {
        try {
          const { default: NotificationLog } = await import("../models/NotificationLog");
          await NotificationLog.update(
            {
              errorMessage: error instanceof Error ? error.message : String(error),
              fcmResponse: { error: true, duration: Date.now() - startTime }
            },
            { where: { id: logId } }
          );
        } catch (logError) {
          logger.error({ err: logError }, "Failed to update notification log with error");
        }
      }

      logger.error({ err: error }, "Error sending broadcast notification");
      throw error;
    }
  }
}

export default new NotificationService();
