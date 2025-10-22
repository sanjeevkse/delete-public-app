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
  () => (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    if (!header) {
      throw new ApiError("Authorization header missing", 401);
    }

    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
      throw new ApiError("Invalid authorization header format", 401);
    }

    try {
      const payload = verifyAccessToken(token);
      req.user = {
        id: payload.userId,
        roles: Array.isArray(payload.roles) ? payload.roles : [],
        permissions: Array.isArray(payload.permissions) ? payload.permissions : []
      };
      next();
    } catch {
      throw new ApiError("Invalid or expired token", 401);
    }
  };

export const requireAuthenticatedUser = (req: AuthenticatedRequest) => {
  if (!req.user) {
    throw new ApiError("Authentication required", 401);
  }

  return req.user;
};
