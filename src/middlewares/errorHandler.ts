import type { NextFunction, Request, Response } from "express";

import logger from "../utils/logger";

// Custom error interface to carry HTTP status codes.
interface HttpError extends Error {
  status?: number;
}

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    message: "Resource not found",
    path: req.originalUrl
  });
};

export const errorHandler = (
  err: HttpError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.status ?? 500;
  if (statusCode >= 500) {
    logger.error({ err }, "Unhandled server error");
  } else {
    logger.warn({ err }, "Handled application error");
  }

  res.status(statusCode).json({
    message: err.message ?? "Internal Server Error"
  });
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
