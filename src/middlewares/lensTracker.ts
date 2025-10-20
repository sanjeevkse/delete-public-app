import type { Express, NextFunction, Request, Response } from "express";

import env from "../config/env";
import logger from "../utils/logger";

type LensInstance = {
  track?: (req: Request, res: Response) => void;
  middleware?: (req: Request, res: Response, next: NextFunction) => void;
  listen?: (port: number) => void;
  start?: () => void;
};

let lensInstance: LensInstance | null = null;
let initialized = false;

export const setupLens = (app: Express): void => {
  if (initialized) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
    const lensModule = require("lens.js");
    const candidate = lensModule?.default ?? lensModule;

    if (typeof candidate === "function") {
      // Some builds export a function that accepts the Express app.
      lensInstance = candidate({ app, port: env.lensPort });
    } else if (candidate && typeof candidate.create === "function") {
      lensInstance = candidate.create({ app, port: env.lensPort });
    } else if (candidate && typeof candidate.start === "function") {
      lensInstance = candidate.start({ app, port: env.lensPort });
    } else {
      lensInstance = candidate as LensInstance;
    }

    if (lensInstance?.listen) {
      lensInstance.listen(env.lensPort);
    } else if (lensInstance?.start) {
      lensInstance.start();
    }

    initialized = true;
    logger.info({ port: env.lensPort }, "Lens.js request/response tracking enabled");
  } catch (error) {
    initialized = true;
    logger.warn(
      { err: error },
      "Lens.js instrumentation failed to initialize; proceeding without external tracking"
    );
  }
};

export const lensMiddleware = () => (req: Request, res: Response, next: NextFunction): void => {
  if (lensInstance?.middleware) {
    try {
      return lensInstance.middleware(req, res, next);
    } catch (error) {
      logger.warn({ err: error }, "Lens.js middleware threw an error");
    }
  }

  if (lensInstance?.track) {
    try {
      lensInstance.track(req, res);
    } catch (error) {
      logger.warn({ err: error }, "Lens.js track call failed");
    }
  }

  next();
};
