import admin from "firebase-admin";
import env from "./env";

let firebaseApp: admin.app.App | null = null;

export const initializeFirebase = (): void => {
  if (firebaseApp) {
    return; // Already initialized
  }

  try {
    // Initialize with service account credentials
    if (env.firebase.serviceAccountPath) {
      const serviceAccount = require(env.firebase.serviceAccountPath);
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else if (env.firebase.serviceAccountJson) {
      // Alternative: Initialize with JSON string from environment variable
      const serviceAccount = JSON.parse(env.firebase.serviceAccountJson);
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      console.warn("Firebase credentials not configured. Push notifications will not work.");
      return;
    }

    console.log("Firebase Admin SDK initialized successfully");
  } catch (error) {
    console.error("Failed to initialize Firebase Admin SDK:", error);
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
