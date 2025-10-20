import app from "./app";
import env from "./config/env";
import sequelize from "./config/database";
import "./models";
import "./events/subscribers";
import { setupLens } from "./middlewares/lensTracker";
import logger from "./utils/logger";

const startServer = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    logger.info("Database connection established");
  } catch (error) {
    logger.error({ err: error }, "Unable to connect to the database");
    process.exit(1);
  }

  setupLens(app);

  app.listen(env.port, () => {
    logger.info(`Server ready on port ${env.port}`);
  });
};

void startServer();
