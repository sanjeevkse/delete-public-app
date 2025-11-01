import type { NextFunction, Request, Response } from "express";
import { UniqueConstraintError, ValidationError as SequelizeValidationError } from "sequelize";

import logger from "../utils/logger";
import telescopeService from "../services/telescopeService";

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

export const errorHandler = async (
  err: HttpError,
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  let alreadyLogged = false;
  let statusCode: number;
  let errorCode: string;
  let errorMessage: string;
  let errorDetails: unknown | undefined;

  if (err instanceof UniqueConstraintError) {
    const messages = Array.from(new Set(err.errors.map((item) => item.message))).filter(Boolean);
    const details = err.errors.map((item) => ({
      message: item.message,
      field: item.path,
      value: item.value
    }));

    logger.warn({ err, details }, "Handled unique constraint error");

    statusCode = 409;
    errorCode = "CONFLICT";
    errorMessage = messages.join("; ") || err.message || "Resource already exists";
    errorDetails = details.length ? details : undefined;
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

    statusCode = 422;
    errorCode = "VALIDATION_ERROR";
    errorMessage = messages.join("; ") || err.message || "Validation failed";
    errorDetails = details.length ? details : undefined;
    alreadyLogged = true;
  } else {
    statusCode = err.status ?? 500;
    errorCode = err.code || "";
    errorMessage = err.message;
    errorDetails = err.details;
  }

  if (!alreadyLogged) {
    if (statusCode >= 500) {
      logger.error({ err }, "Unhandled server error");
    } else {
      logger.warn({ err }, "Handled application error");
    }
  }

  // Log exception to Telescope (only for server errors or significant errors)
  if (statusCode >= 500 || statusCode === 422 || statusCode === 409) {
    try {
      const exception = await telescopeService.logException(err, {
        statusCode,
        errorCode,
        path: req.path,
        method: req.method,
        userId: (req as any).user?.id || null
      });

      // Store exception ID in request for linking
      if (exception) {
        (req as any).telescopeExceptionId = exception.id;
      }
    } catch (telescopeError) {
      // Don't let telescope errors break the error handler
      logger.error({ telescopeError }, "Failed to log exception to Telescope");
    }
  }

  // Map status codes to error codes if not already set
  if (!errorCode) {
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

    errorCode = errorCodeMap[statusCode] || "UNKNOWN_ERROR";
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: errorMessage ?? "Internal Server Error",
      ...(errorDetails !== undefined ? { details: errorDetails } : {})
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
