import type { NextFunction, Request, Response } from "express";

import logger from "../utils/logger";

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  res.on("finish", () => {
    // Skip logging Telescope requests to avoid noise
    if (req.originalUrl.startsWith("/telescope")) {
      return;
    }

    const duration = Date.now() - start;
    logger.info(
      {
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        duration
      },
      "Request completed"
    );
  });
  next();
};
