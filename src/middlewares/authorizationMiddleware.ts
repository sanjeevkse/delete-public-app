import type { NextFunction, Response } from "express";

import type { AuthenticatedRequest } from "./authMiddleware";
import { ApiError } from "./errorHandler";
import { ADMIN_ROLE_NAME } from "../config/rbac";

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
    const roles = req.user?.roles ?? [];
    const permissions = req.user?.permissions ?? [];

    // Admin role has all permissions automatically
    const normalizedRoles = roles.map(normalize);
    if (normalizedRoles.includes(ADMIN_ROLE_NAME.toLowerCase())) {
      next();
      return;
    }

    if (permissions.length === 0) {
      throw new ApiError("Forbidden", 403);
    }

    const normalizedPermissions = permissions.map(normalize);
    const normalizedAllowed = allowedPermissions.map(normalize);

    const hasWildcardPermission = normalizedPermissions.includes("*");

    const hasPermission =
      hasWildcardPermission ||
      normalizedAllowed.some((permission) => {
        if (normalizedPermissions.includes(permission)) {
          return true;
        }

        const [module] = permission.split(":");
        if (!module) {
          return false;
        }

        const moduleWildcard = `${module}:*`;
        return normalizedPermissions.includes(moduleWildcard);
      });

    if (!hasPermission) {
      throw new ApiError("Forbidden", 403);
    }

    next();
  };
