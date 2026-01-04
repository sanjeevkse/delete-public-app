import type { NextFunction, Request, Response } from "express";

import { ApiError } from "./errorHandler";
import { verifyAccessToken } from "../utils/auth";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    roles: string[];
    permissions: string[];
  };
}

export const authenticate =
  () =>
  (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    const header = req.headers.authorization?.trim();
    if (!header) {
      throw new ApiError("Authorization header missing", 401);
    }

    const match = header.match(/^(\S+)\s+(.+)$/);
    if (!match) {
      throw new ApiError("Invalid authorization header format", 401);
    }

    const [, scheme, rawToken] = match;
    const token = rawToken.trim();
    if (!/^(Bearer)$/i.test(scheme) || token === "") {
      throw new ApiError("Invalid authorization header format", 401);
    }

    try {
      const payload = verifyAccessToken(token);
      console.log("[AUTH DEBUG] Token verified:", payload);
      req.user = {
        id: payload.userId,
        roles: Array.isArray(payload.roles) ? payload.roles : [],
        permissions: Array.isArray(payload.permissions) ? payload.permissions : []
      };
      console.log("[AUTH DEBUG] User set:", req.user);
      next();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.log("[AUTH DEBUG] Token verification failed:", errorMsg);
      console.log("[AUTH DEBUG] Token:", token.substring(0, 50) + "...");
      throw new ApiError("Invalid or expired token", 401);
    }
  };

/**
 * Optional authentication middleware
 * If token is provided, it validates and sets req.user
 * If no token, it proceeds without setting req.user
 * Controllers can then check if req.user exists to apply filters
 */
export const authenticateOptional =
  () =>
  (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    const header = req.headers.authorization?.trim();

    // If no authorization header, allow access (public)
    if (!header) {
      console.log("[AUTH DEBUG] No token provided - public access");
      next();
      return;
    }

    const match = header.match(/^(\S+)\s+(.+)$/);
    if (!match) {
      throw new ApiError("Invalid authorization header format", 401);
    }

    const [, scheme, rawToken] = match;
    const token = rawToken.trim();
    if (!/^(Bearer)$/i.test(scheme) || token === "") {
      throw new ApiError("Invalid authorization header format", 401);
    }

    try {
      const payload = verifyAccessToken(token);
      console.log("[AUTH DEBUG] Optional token verified:", payload);
      req.user = {
        id: payload.userId,
        roles: Array.isArray(payload.roles) ? payload.roles : [],
        permissions: Array.isArray(payload.permissions) ? payload.permissions : []
      };
      console.log("[AUTH DEBUG] User set:", req.user);
      next();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.log("[AUTH DEBUG] Optional token verification failed:", errorMsg);
      console.log("[AUTH DEBUG] Token:", token.substring(0, 50) + "...");

      // For debug purposes, attach error to request
      (req as any).authError = {
        message: errorMsg,
        tokenPreview: token.substring(0, 50) + "..."
      };

      throw new ApiError(`Invalid or expired token: ${errorMsg}`, 401);
    }
  };

export const requireAuthenticatedUser = (req: AuthenticatedRequest) => {
  if (!req.user) {
    throw new ApiError("Authentication required", 401);
  }

  return req.user;
};
