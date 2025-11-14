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
}

export default new NotificationService();
