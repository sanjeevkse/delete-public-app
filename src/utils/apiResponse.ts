import type { Response } from "express";

/**
 * Standard API Response Structure
 */
interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  pagination?: PaginationMeta;
}

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Send a standardized success response
 * @param res - Express response object
 * @param data - The data to send in the response
 * @param message - Optional success message
 * @param statusCode - HTTP status code (default: 200)
 */
export const sendSuccess = <T = any>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200
): Response => {
  const response: SuccessResponse<T> = {
    success: true,
    data
  };

  if (message) {
    response.message = message;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send a standardized success response with pagination
 * @param res - Express response object
 * @param data - The data array to send
 * @param pagination - Pagination metadata
 * @param message - Optional success message
 * @param statusCode - HTTP status code (default: 200)
 */
export const sendSuccessWithPagination = <T = any>(
  res: Response,
  data: T[],
  pagination: PaginationMeta,
  message?: string,
  statusCode: number = 200
): Response => {
  const response: SuccessResponse<T[]> = {
    success: true,
    data,
    pagination
  };

  if (message) {
    response.message = message;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send a standardized created response (201)
 * @param res - Express response object
 * @param data - The created resource data
 * @param message - Optional success message
 */
export const sendCreated = <T = any>(
  res: Response,
  data: T,
  message: string = "Resource created successfully"
): Response => {
  return sendSuccess(res, data, message, 201);
};

/**
 * Send a standardized no content response (204)
 * @param res - Express response object
 */
export const sendNoContent = (res: Response): Response => {
  return res.status(204).send();
};

/**
 * Send a standardized error response
 * @param res - Express response object
 * @param code - Error code (e.g., 'VALIDATION_ERROR', 'NOT_FOUND')
 * @param message - Error message
 * @param statusCode - HTTP status code (default: 400)
 * @param details - Optional additional error details
 */
export const sendError = (
  res: Response,
  code: string,
  message: string,
  statusCode: number = 400,
  details?: any
): Response => {
  const response: ErrorResponse = {
    success: false,
    error: {
      code,
      message
    }
  };

  if (details) {
    response.error.details = details;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send a standardized validation error response (422)
 * @param res - Express response object
 * @param message - Error message
 * @param details - Validation error details
 */
export const sendValidationError = (
  res: Response,
  message: string = "Validation failed",
  details?: any
): Response => {
  return sendError(res, "VALIDATION_ERROR", message, 422, details);
};

/**
 * Send a standardized not found error response (404)
 * @param res - Express response object
 * @param message - Error message
 * @param resource - Optional resource name that was not found
 */
export const sendNotFound = (
  res: Response,
  message: string = "Resource not found",
  resource?: string
): Response => {
  const code = resource ? `${resource.toUpperCase()}_NOT_FOUND` : "NOT_FOUND";
  return sendError(res, code, message, 404);
};

/**
 * Send a standardized unauthorized error response (401)
 * @param res - Express response object
 * @param message - Error message
 */
export const sendUnauthorized = (
  res: Response,
  message: string = "Authentication required"
): Response => {
  return sendError(res, "UNAUTHORIZED", message, 401);
};

/**
 * Send a standardized forbidden error response (403)
 * @param res - Express response object
 * @param message - Error message
 */
export const sendForbidden = (
  res: Response,
  message: string = "Insufficient permissions"
): Response => {
  return sendError(res, "FORBIDDEN", message, 403);
};

/**
 * Send a standardized conflict error response (409)
 * @param res - Express response object
 * @param message - Error message
 * @param resource - Optional resource name that conflicts
 */
export const sendConflict = (
  res: Response,
  message: string = "Resource already exists",
  resource?: string
): Response => {
  const code = resource ? `${resource.toUpperCase()}_CONFLICT` : "CONFLICT";
  return sendError(res, code, message, 409);
};

/**
 * Send a standardized bad request error response (400)
 * @param res - Express response object
 * @param message - Error message
 */
export const sendBadRequest = (res: Response, message: string = "Bad request"): Response => {
  return sendError(res, "BAD_REQUEST", message, 400);
};

/**
 * Send a standardized internal server error response (500)
 * @param res - Express response object
 * @param message - Error message
 */
export const sendInternalError = (
  res: Response,
  message: string = "Internal server error"
): Response => {
  return sendError(res, "INTERNAL_ERROR", message, 500);
};

/**
 * Calculate pagination metadata
 * @param total - Total number of records
 * @param page - Current page number
 * @param limit - Records per page
 */
export const calculatePagination = (total: number, page: number, limit: number): PaginationMeta => {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit)
  };
};

/**
 * Parse pagination parameters from request query
 * @param page - Page number from query (string or number)
 * @param limit - Limit from query (string or number)
 * @param defaultLimit - Default limit if not provided
 * @param maxLimit - Maximum allowed limit
 */
export const parsePaginationParams = (
  page?: string | number,
  limit?: string | number,
  defaultLimit: number = 10,
  maxLimit: number = 100
): { page: number; limit: number; offset: number } => {
  const parsedPage = Math.max(1, parseInt(String(page || 1), 10));
  const parsedLimit = Math.min(maxLimit, Math.max(1, parseInt(String(limit || defaultLimit), 10)));
  const offset = (parsedPage - 1) * parsedLimit;

  return {
    page: parsedPage,
    limit: parsedLimit,
    offset
  };
};

/**
 * Type-safe response types for TypeScript
 */
export type ApiSuccessResponse<T = any> = SuccessResponse<T>;
export type ApiErrorResponse = ErrorResponse;
export type ApiPaginationMeta = PaginationMeta;
