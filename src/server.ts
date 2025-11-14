import app, { registerErrorHandlers } from "./app";
import env from "./config/env";
import sequelize from "./config/database";
import { initializeFirebase } from "./config/firebase";
import "./models";
import "./events/subscribers";
import { setupLens } from "./middlewares/lensTracker";
import logger from "./utils/logger";
import { createDeviceTokensTable } from "./utils/setupDeviceTokensTable";

const startServer = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    logger.info("Database connection established");
  } catch (error) {
    logger.error({ err: error }, "Unable to connect to the database");
    process.exit(1);
  }

  // Create device_tokens table if it doesn't exist
  try {
    await createDeviceTokensTable();
  } catch (error) {
    logger.warn({ err: error }, "Failed to create device_tokens table");
  }

  // Initialize Firebase
  try {
    initializeFirebase();
    logger.info("Firebase initialized");
  } catch (error) {
    logger.warn(
      { err: error },
      "Firebase initialization failed - push notifications will not be available"
    );
  }

  await setupLens(app);
  registerErrorHandlers();

  app.listen(env.port, () => {
    logger.info(`Server ready on port ${env.port}`);
  });
};

void startServer();
