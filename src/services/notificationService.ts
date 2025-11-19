import { getMessaging } from "../config/firebase";
import type { Message, MulticastMessage, BatchResponse } from "firebase-admin/messaging";

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
      console.log("Successfully sent notification:", response);
      return response;
    } catch (error) {
      console.error("Error sending notification:", error);
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
      console.log(`Successfully sent ${response.successCount} notifications`);
      if (response.failureCount > 0) {
        console.log(`Failed to send ${response.failureCount} notifications`);
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            console.error(`Error for token ${options.tokens[idx]}:`, resp.error);
          }
        });
      }
      return response;
    } catch (error) {
      console.error("Error sending multicast notification:", error);
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
      console.log(`Successfully sent notification to topic ${topic}:`, response);
      return response;
    } catch (error) {
      console.error(`Error sending notification to topic ${topic}:`, error);
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
      console.log(`Successfully subscribed ${response.successCount} tokens to topic ${topic}`);
      if (response.failureCount > 0) {
        console.log(`Failed to subscribe ${response.failureCount} tokens`);
      }
    } catch (error) {
      console.error(`Error subscribing to topic ${topic}:`, error);
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
      console.log(`Successfully unsubscribed ${response.successCount} tokens from topic ${topic}`);
      if (response.failureCount > 0) {
        console.log(`Failed to unsubscribe ${response.failureCount} tokens`);
      }
    } catch (error) {
      console.error(`Error unsubscribing from topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Send notification to all active users
   * Fetches all active device tokens from database and sends broadcast
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
      console.log("🔍 sendToAllUsers called with notification:", notification.title);

      // Import models
      const { default: DeviceToken } = await import("../models/DeviceToken");
      const { default: NotificationLog } = await import("../models/NotificationLog");

      // Get all active device tokens
      const deviceTokens = await DeviceToken.findAll({
        where: { isActive: true, status: 1 },
        attributes: ["token"]
      });

      console.log(`📊 Found ${deviceTokens.length} active device tokens`);

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

        console.warn("⚠️ No active device tokens found - cannot send notifications");
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

      // Firebase has limit of 500 tokens per batch
      // Split into chunks if needed
      const BATCH_SIZE = 500;
      const results: BatchResponse[] = [];

      for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
        const batch = tokens.slice(i, i + BATCH_SIZE);
        const response = await this.sendToMultipleDevices({
          tokens: batch,
          notification
        });
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

      console.log(
        `Broadcast notification sent: ${totalSuccess} success, ${totalFailure} failed out of ${tokens.length} total tokens`
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
          console.error("Failed to update notification log with error:", logError);
        }
      }

      console.error("Error sending broadcast notification:", error);
      throw error;
    }
  }
}

export default new NotificationService();
