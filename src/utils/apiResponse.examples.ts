/**
 * API Response Utility - Usage Examples
 * 
 * This file demonstrates how to use the standardized API response utilities
 * across your controllers.
 */

import type { Request, Response } from "express";
import {
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendError,
  sendNotFound,
  sendBadRequest,
  sendUnauthorized,
  sendForbidden,
  sendConflict,
  sendValidationError,
  sendSuccessWithPagination,
  parsePaginationParams,
  calculatePagination,
} from "../utils/apiResponse";
import { ApiError } from "../middlewares/errorHandler";
import asyncHandler from "../utils/asyncHandler";

// ============================================
// EXAMPLE 1: Simple Success Response
// ============================================
export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const user = { id: 1, name: "John Doe", email: "john@example.com" };
  
  // Before:
  // res.json(user);
  
  // After:
  return sendSuccess(res, user, "User retrieved successfully");
  
  // Response:
  // {
  //   "success": true,
  //   "data": { "id": 1, "name": "John Doe", "email": "john@example.com" },
  //   "message": "User retrieved successfully"
  // }
});

// ============================================
// EXAMPLE 2: Create Resource (201)
// ============================================
export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const newUser = { id: 2, name: "Jane Doe", email: "jane@example.com" };
  
  // Before:
  // res.status(201).json(newUser);
  
  // After:
  return sendCreated(res, newUser, "User created successfully");
  
  // Response:
  // Status: 201
  // {
  //   "success": true,
  //   "data": { "id": 2, "name": "Jane Doe", "email": "jane@example.com" },
  //   "message": "User created successfully"
  // }
});

// ============================================
// EXAMPLE 3: Delete Resource (204)
// ============================================
export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  // Delete logic here...
  
  // Before:
  // res.status(204).send();
  
  // After:
  return sendNoContent(res);
  
  // Response: Status 204, no body
});

// ============================================
// EXAMPLE 4: Pagination Response
// ============================================
export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  // Parse pagination parameters
  const { page, limit, offset } = parsePaginationParams(
    req.query.page,
    req.query.limit,
    10,  // default limit
    100  // max limit
  );
  
  // Fetch data with pagination
  const users = [
    { id: 1, name: "User 1" },
    { id: 2, name: "User 2" },
  ];
  const totalUsers = 50;
  
  // Calculate pagination metadata
  const pagination = calculatePagination(totalUsers, page, limit);
  
  // Before:
  // res.json({ users, page, limit, total: totalUsers });
  
  // After:
  return sendSuccessWithPagination(res, users, pagination, "Users retrieved successfully");
  
  // Response:
  // {
  //   "success": true,
  //   "data": [{ "id": 1, "name": "User 1" }, { "id": 2, "name": "User 2" }],
  //   "message": "Users retrieved successfully",
  //   "pagination": {
  //     "page": 1,
  //     "limit": 10,
  //     "total": 50,
  //     "totalPages": 5
  //   }
  // }
});

// ============================================
// EXAMPLE 5: Not Found Error (404)
// ============================================
export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const user = null; // Not found in database
  
  if (!user) {
    // Before:
    // throw new ApiError("User not found", 404);
    
    // After:
    return sendNotFound(res, "User not found", "user");
    
    // Response:
    // Status: 404
    // {
    //   "success": false,
    //   "error": {
    //     "code": "USER_NOT_FOUND",
    //     "message": "User not found"
    //   }
    // }
  }
  
  return sendSuccess(res, user);
});

// ============================================
// EXAMPLE 6: Validation Error (422)
// ============================================
export const validateInput = asyncHandler(async (req: Request, res: Response) => {
  const errors = [
    { field: "email", message: "Invalid email format" },
    { field: "password", message: "Password must be at least 8 characters" }
  ];
  
  if (errors.length > 0) {
    // Before:
    // throw new ApiError("Validation failed", 422);
    
    // After:
    return sendValidationError(res, "Validation failed", errors);
    
    // Response:
    // Status: 422
    // {
    //   "success": false,
    //   "error": {
    //     "code": "VALIDATION_ERROR",
    //     "message": "Validation failed",
    //     "details": [
    //       { "field": "email", "message": "Invalid email format" },
    //       { "field": "password", "message": "Password must be at least 8 characters" }
    //     ]
    //   }
    // }
  }
  
  return sendSuccess(res, {}, "Validation passed");
});

// ============================================
// EXAMPLE 7: Unauthorized Error (401)
// ============================================
export const protectedRoute = asyncHandler(async (req: Request, res: Response) => {
  const token = req.headers.authorization;
  
  if (!token) {
    // Before:
    // throw new ApiError("Authentication required", 401);
    
    // After:
    return sendUnauthorized(res, "Authentication token is required");
    
    // Response:
    // Status: 401
    // {
    //   "success": false,
    //   "error": {
    //     "code": "UNAUTHORIZED",
    //     "message": "Authentication token is required"
    //   }
    // }
  }
  
  return sendSuccess(res, {}, "Access granted");
});

// ============================================
// EXAMPLE 8: Forbidden Error (403)
// ============================================
export const adminOnly = asyncHandler(async (req: Request, res: Response) => {
  const userRole = "user"; // From authentication
  
  if (userRole !== "admin") {
    // Before:
    // throw new ApiError("Insufficient permissions", 403);
    
    // After:
    return sendForbidden(res, "Admin access required");
    
    // Response:
    // Status: 403
    // {
    //   "success": false,
    //   "error": {
    //     "code": "FORBIDDEN",
    //     "message": "Admin access required"
    //   }
    // }
  }
  
  return sendSuccess(res, {}, "Admin action completed");
});

// ============================================
// EXAMPLE 9: Conflict Error (409)
// ============================================
export const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const existingUser = { email: "john@example.com" }; // Already exists
  
  if (existingUser) {
    // Before:
    // throw new ApiError("User already exists", 409);
    
    // After:
    return sendConflict(res, "User with this email already exists", "user");
    
    // Response:
    // Status: 409
    // {
    //   "success": false,
    //   "error": {
    //     "code": "USER_CONFLICT",
    //     "message": "User with this email already exists"
    //   }
    // }
  }
  
  return sendCreated(res, {}, "User registered successfully");
});

// ============================================
// EXAMPLE 10: Bad Request Error (400)
// ============================================
export const processRequest = asyncHandler(async (req: Request, res: Response) => {
  const { action } = req.body;
  
  if (!action) {
    // Before:
    // throw new ApiError("Action is required", 400);
    
    // After:
    return sendBadRequest(res, "Action parameter is required");
    
    // Response:
    // Status: 400
    // {
    //   "success": false,
    //   "error": {
    //     "code": "BAD_REQUEST",
    //     "message": "Action parameter is required"
    //   }
    // }
  }
  
  return sendSuccess(res, {}, "Request processed");
});

// ============================================
// EXAMPLE 11: Using ApiError with custom code
// ============================================
export const customError = asyncHandler(async (req: Request, res: Response) => {
  // You can still throw ApiError for use with error handler middleware
  throw new ApiError(
    "Custom error occurred",
    400,
    "CUSTOM_ERROR_CODE",
    { customField: "additional info" }
  );
  
  // Error handler will return:
  // Status: 400
  // {
  //   "success": false,
  //   "error": {
  //     "code": "CUSTOM_ERROR_CODE",
  //     "message": "Custom error occurred",
  //     "details": { "customField": "additional info" }
  //   }
  // }
});

// ============================================
// EXAMPLE 12: Generic Error Response
// ============================================
export const customErrorResponse = asyncHandler(async (req: Request, res: Response) => {
  const someCondition = false;
  
  if (!someCondition) {
    return sendError(
      res,
      "CUSTOM_ERROR",
      "Something went wrong",
      400,
      { additionalInfo: "Debug information" }
    );
  }
  
  return sendSuccess(res, {}, "Success");
});
