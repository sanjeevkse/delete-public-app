import type { Response } from "express";

/**
 * Standard API Response Structure
 */
interface SuccessResponse<T = unknown> {
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
    details?: unknown;
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
export const sendSuccess = <T = unknown>(
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
export const sendSuccessWithPagination = <T = unknown>(
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
export const sendCreated = <T = unknown>(
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
  return sendSuccess(res, {}, "Successful operation", 200);
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
  details?: unknown
): Response => {
  const response: ErrorResponse = {
    success: false,
    error: {
      code,
      message
    }
  };

  if (details !== undefined) {
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
  details?: unknown
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
 * Validate and map sort column parameter to allowed fields
 * @param requestedColumn - The column name from query parameter (sortColumn)
 * @param allowedColumns - Array of allowed column names for this entity
 * @param defaultColumn - Default column to sort by
 * @returns The validated column name to use in database query
 */
export const validateSortColumn = (
  requestedColumn: unknown,
  allowedColumns: string[],
  defaultColumn: string = "id"
): string => {
  if (!requestedColumn || typeof requestedColumn !== "string") {
    return defaultColumn;
  }

  const trimmed = requestedColumn.trim();
  if (allowedColumns.includes(trimmed)) {
    return trimmed;
  }

  return defaultColumn;
};

/**
 * Parse and validate sort direction parameter
 * @param value - The sort direction from query parameter (sort)
 * @param defaultDirection - Default sort direction to use
 * @returns Validated sort direction: 'ASC' or 'DESC'
 */
export const parseSortDirection = (
  value: unknown,
  defaultDirection: "ASC" | "DESC" = "DESC"
): "ASC" | "DESC" => {
  if (typeof value !== "string") {
    return defaultDirection;
  }
  const normalized = value.trim().toUpperCase();
  if (normalized === "ASC" || normalized === "DESC") {
    return normalized;
  }
  return defaultDirection;
};

/**
 * Parse required string parameter
 * @param value - The value to parse
 * @param field - Field name for error messages
 * @returns Trimmed non-empty string
 * @throws Error if value is not a string or is empty
 */
export const parseRequiredString = (value: unknown, field: string): string => {
  if (typeof value !== "string") {
    throw new Error(`${field} is required`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${field} cannot be empty`);
  }
  return trimmed;
};

/**
 * Parse optional string parameter
 * @param value - The value to parse
 * @returns Trimmed string or null
 */
export const parseOptionalString = (value: unknown): string | null => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error("Invalid input type");
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/**
 * Parse required number parameter
 * @param value - The value to parse
 * @param field - Field name for error messages
 * @returns Parsed number
 * @throws Error if value cannot be parsed as a number
 */
export const parseRequiredNumber = (value: unknown, field: string): number => {
  if (value === undefined || value === null || value === "") {
    throw new Error(`${field} is required`);
  }
  const numberValue = typeof value === "number" ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(numberValue)) {
    throw new Error(`${field} must be a valid number`);
  }
  return numberValue;
};

/**
 * Parse optional number parameter
 * @param value - The value to parse
 * @param field - Field name for error messages
 * @returns Parsed number or undefined
 * @throws Error if value cannot be parsed as a number (when provided)
 */
export const parseOptionalNumber = (value: unknown, field: string): number | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === "") {
    return undefined;
  }
  const numberValue = typeof value === "number" ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(numberValue)) {
    throw new Error(`${field} must be a valid number`);
  }
  return numberValue;
};

/**
 * Parse status filter parameter
 * @param value - The value to parse
 * @returns Parsed status (0 or 1), null (for "all"), or undefined
 * @throws Error if value is not a valid status
 */
export const parseStatusFilter = (value: unknown): number | null | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value === "string" && value.trim().toLowerCase() === "all") {
    return null;
  }
  const numericValue = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(numericValue) || ![0, 1].includes(numericValue)) {
    throw new Error("Status must be 0 or 1");
  }
  return numericValue;
};

/**
 * Parse boolean query parameter
 * @param value - The value to parse
 * @param defaultValue - Default value if not provided
 * @returns Parsed boolean
 */
export const parseBooleanQuery = (value: unknown, defaultValue = false): boolean => {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes") {
      return true;
    }
    if (normalized === "false" || normalized === "0" || normalized === "no") {
      return false;
    }
  }
  return defaultValue;
};

/**
 * Type-safe response types for TypeScript
 */
export type ApiSuccessResponse<T = unknown> = SuccessResponse<T>;
export type ApiErrorResponse = ErrorResponse;
export type ApiPaginationMeta = PaginationMeta;
