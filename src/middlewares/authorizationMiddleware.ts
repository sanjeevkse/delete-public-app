import type { NextFunction, Response } from "express";

import type { AuthenticatedRequest } from "./authMiddleware";
import { ApiError } from "./errorHandler";

const normalize = (value: string): string => value.toLowerCase();

export const authorizeRoles =
  (...allowedRoles: string[]) =>
  (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    const roles = req.user?.roles ?? [];
    if (roles.length === 0) {
      throw new ApiError("Forbidden", 403);
    }

    const normalizedRoles = roles.map(normalize);
    const normalizedAllowed = allowedRoles.map(normalize);

    const isAllowed = normalizedAllowed.some((role) => normalizedRoles.includes(role));
    if (!isAllowed) {
      throw new ApiError("Forbidden", 403);
    }

    next();
  };

export const authorizePermissions =
  (...allowedPermissions: string[]) =>
  (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    const permissions = req.user?.permissions ?? [];
    if (permissions.length === 0) {
      throw new ApiError("Forbidden", 403);
    }

    const normalizedPermissions = permissions.map(normalize);
    const normalizedAllowed = allowedPermissions.map(normalize);

    const hasPermission = normalizedAllowed.some((permission) =>
      normalizedPermissions.includes(permission)
    );
    if (!hasPermission) {
      throw new ApiError("Forbidden", 403);
    }

    next();
  };
