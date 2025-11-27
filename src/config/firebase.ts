import admin from "firebase-admin";
import env from "./env";
import logger from "../utils/logger";

let firebaseApp: admin.app.App | null = null;

export const initializeFirebase = (): void => {
  if (firebaseApp) {
    return; // Already initialized
  }

  try {
    // Initialize with service account credentials
    if (env.firebase.serviceAccountPath) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const serviceAccount = require(env.firebase.serviceAccountPath);
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      logger.info("Firebase Admin SDK initialized successfully with service account path");
    } else if (env.firebase.serviceAccountJson) {
      // Alternative: Initialize with JSON string from environment variable
      const serviceAccount = JSON.parse(env.firebase.serviceAccountJson);
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      logger.info("Firebase Admin SDK initialized successfully with service account JSON");
    } else {
      logger.warn("Firebase credentials not configured. Push notifications will not work.");
      logger.warn(
        "Please set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON environment variable"
      );
      return;
    }
  } catch (error) {
    logger.error({ err: error }, "Failed to initialize Firebase Admin SDK");
    throw error;
  }
};

export const getFirebaseApp = (): admin.app.App => {
  if (!firebaseApp) {
    throw new Error("Firebase has not been initialized. Call initializeFirebase() first.");
  }
  return firebaseApp;
};

export const getMessaging = (): admin.messaging.Messaging => {
  return getFirebaseApp().messaging();
};

export default { initializeFirebase, getFirebaseApp, getMessaging };
