import type { NextFunction, Request, Response } from "express";
import { UniqueConstraintError, ValidationError as SequelizeValidationError } from "sequelize";

import logger from "../utils/logger";

// Custom error interface to carry HTTP status codes.
interface HttpError extends Error {
  status?: number;
  code?: string;
  details?: unknown;
}

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "Resource not found",
      details: { path: req.originalUrl }
    }
  });
};

export const errorHandler = (
  err: HttpError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let alreadyLogged = false;

  if (err instanceof UniqueConstraintError) {
    const messages = Array.from(new Set(err.errors.map((item) => item.message))).filter(Boolean);
    const details = err.errors.map((item) => ({
      message: item.message,
      field: item.path,
      value: item.value
    }));

    logger.warn({ err, details }, "Handled unique constraint error");

    err.status = err.status ?? 409;
    err.code = err.code ?? "CONFLICT";
    err.message = messages.join("; ") || err.message || "Resource already exists";
    if (details.length && err.details === undefined) {
      err.details = details;
    }
    alreadyLogged = true;
  } else if (err instanceof SequelizeValidationError) {
    const messages = Array.from(new Set(err.errors.map((item) => item.message))).filter(Boolean);
    const details = err.errors.map((item) => ({
      message: item.message,
      field: item.path,
      value: item.value,
      validator: item.validatorKey
    }));

    logger.warn({ err, details }, "Handled validation error");

    err.status = err.status ?? 422;
    err.code = err.code ?? "VALIDATION_ERROR";
    err.message = messages.join("; ") || err.message || "Validation failed";
    if (details.length && err.details === undefined) {
      err.details = details;
    }
    alreadyLogged = true;
  }

  const statusCode = err.status ?? 500;
  if (!alreadyLogged) {
    if (statusCode >= 500) {
      logger.error({ err }, "Unhandled server error");
    } else {
      logger.warn({ err }, "Handled application error");
    }
  }

  // Map status codes to error codes
  const errorCodeMap: Record<number, string> = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    409: "CONFLICT",
    422: "VALIDATION_ERROR",
    500: "INTERNAL_ERROR",
    503: "SERVICE_UNAVAILABLE"
  };

  const errorCode = err.code || errorCodeMap[statusCode] || "UNKNOWN_ERROR";

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: err.message ?? "Internal Server Error",
      ...(err.details !== undefined ? { details: err.details } : {})
    }
  });
};

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status = 400, code?: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
