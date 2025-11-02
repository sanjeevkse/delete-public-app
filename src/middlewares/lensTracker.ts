import type { Express } from "express";
import { lens } from "@lensjs/express";
import type { Dialect } from "sequelize";
import { createSequelizeHandler, type SequelizeQueryType } from "@lensjs/watchers";

import logger from "../utils/logger";
import env from "../config/env";

let initialized = false;

type ExpressWithRouter = Express & {
  _router?: {
    stack?: Array<Record<string, unknown>>;
  };
};

const resolveSequelizeProvider = (dialect: Dialect): SequelizeQueryType | null => {
  const map: Partial<Record<Dialect, SequelizeQueryType>> = {
    mysql: "mysql",
    mariadb: "mariadb",
    postgres: "postgresql",
    sqlite: "sqlite"
  };

  return map[dialect] ?? null;
};

export const setupLens = async (app: Express): Promise<void> => {
  if (initialized) return;

  try {
    const expressApp = app as ExpressWithRouter;
    const routerStack = expressApp._router?.stack;
    const initialStackLength = Array.isArray(routerStack) ? routerStack.length : 0;

    const lensConfig: Parameters<typeof lens>[0] = {
      app,
      ignoredPaths: [/^\/lens(?:\/.*)?$/, /^\/telescope(?:\/.*)?$/, /^\/uploads(?:\/.*)?$/],
      requestWatcherEnabled: true,
      cacheWatcherEnabled: false
    };

    const provider = resolveSequelizeProvider(env.database.dialect);
    if (provider) {
      lensConfig.queryWatcher = {
        enabled: true,
        handler: createSequelizeHandler({ provider })
      };
    }

    const { handleExceptions } = await lens(lensConfig);

    if (Array.isArray(routerStack) && routerStack.length > initialStackLength) {
      const newlyAddedLayers = routerStack.splice(initialStackLength);
      const expressInitIndex = routerStack.findIndex(
        (layer) => typeof layer?.name === "string" && layer.name === "expressInit"
      );

      const insertIndex = expressInitIndex >= 0 ? expressInitIndex + 1 : 0;
      routerStack.splice(insertIndex, 0, ...newlyAddedLayers);
    }

    handleExceptions?.();

    initialized = true;
    logger.info("Lens dashboard enabled at /lens");
  } catch (error) {
    initialized = true;
    logger.warn(
      { err: error },
      "Lens instrumentation failed to initialize; proceeding without external tracking"
    );
  }
};
