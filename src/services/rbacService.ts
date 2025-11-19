import type { Transaction } from "sequelize";
import { Op } from "sequelize";

import { PUBLIC_ROLE_NAME, ADMIN_ROLE_NAME } from "../config/rbac";
import { ApiError } from "../middlewares/errorHandler";
import MetaPermission from "../models/MetaPermission";
import MetaUserRole from "../models/MetaUserRole";
import User from "../models/User";
import UserRole from "../models/UserRole";

export type UserAccessProfile = {
  roles: string[];
  permissions: string[];
};

export const getRoleByName = async (name: string): Promise<MetaUserRole | null> => {
  return MetaUserRole.findOne({
    where: {
      dispName: name
    }
  });
};

export const getRolesByIds = async (roleIds: number[]): Promise<MetaUserRole[]> => {
  if (roleIds.length === 0) {
    return [];
  }

  return MetaUserRole.findAll({
    where: { id: { [Op.in]: roleIds } }
  });
};

export const parseRoleIdsInput = (input: unknown): number[] | null => {
  if (input === undefined || input === null) {
    return null;
  }

  if (!Array.isArray(input)) {
    throw new ApiError("roleIds must be an array of numeric identifiers", 400);
  }

  const parsed = input.map((value) => Number(value));
  if (parsed.some((value) => !Number.isInteger(value) || value <= 0)) {
    throw new ApiError("roleIds must contain positive integers", 400);
  }

  return Array.from(new Set(parsed));
};

export const resolveRoleIdsOrDefault = async (roleIds: number[] | null): Promise<number[]> => {
  if (!roleIds || roleIds.length === 0) {
    const defaultRole = await getRoleByName(PUBLIC_ROLE_NAME);
    if (!defaultRole) {
      throw new ApiError("Default public role is not configured", 500);
    }
    return [defaultRole.id];
  }

  const roles = await getRolesByIds(roleIds);
  if (roles.length !== roleIds.length) {
    throw new ApiError("One or more roles were not found", 400);
  }

  return roleIds;
};

export const setUserRoles = async (
  userId: number,
  roleIds: number[],
  options?: { transaction?: Transaction }
): Promise<void> => {
  const uniqueRoleIds = Array.from(new Set(roleIds));

  await UserRole.destroy({
    where: { userId },
    transaction: options?.transaction
  });

  if (uniqueRoleIds.length === 0) {
    return;
  }

  const payload = uniqueRoleIds.map((roleId) => ({
    userId,
    roleId,
    status: 1
  }));

  await UserRole.bulkCreate(payload, {
    ignoreDuplicates: true,
    transaction: options?.transaction
  });
};

export const ensurePermissionsLoaded = async (roles: MetaUserRole[]): Promise<MetaUserRole[]> => {
  const resolvedRoles = await Promise.all(
    roles.map(async (role) => {
      if (role.permissions) {
        return role;
      }
      const roleWithPermissions = await MetaUserRole.findByPk(role.id, {
        include: [{ model: MetaPermission, as: "permissions" }]
      });
      return roleWithPermissions ?? role;
    })
  );

  return resolvedRoles;
};

/**
 * Check if any of the given roles is the Admin role
 */
export const hasAdminRole = (roles: MetaUserRole[] | string[]): boolean => {
  if (roles.length === 0) {
    return false;
  }

  // Handle both MetaUserRole objects and string arrays
  const roleNames = roles.map((role) => (typeof role === "string" ? role : role.dispName));

  const normalizedRoles = roleNames.map((name) => name.toLowerCase());
  return normalizedRoles.includes(ADMIN_ROLE_NAME.toLowerCase());
};

/**
 * Ensure Admin roles have all permissions loaded
 * Replaces permissions for Admin roles with all available permissions
 */
export const enrichAdminRolePermissions = async (
  roles: MetaUserRole[]
): Promise<MetaUserRole[]> => {
  if (roles.length === 0) {
    return roles;
  }

  let allPermissions: MetaPermission[] | null = null;

  const enrichedRoles = await Promise.all(
    roles.map(async (role) => {
      if (hasAdminRole([role])) {
        // Lazy load all permissions only if we encounter an Admin role
        if (!allPermissions) {
          allPermissions = await MetaPermission.findAll({
            where: { status: 1 }
          });
        }
        // Return a new object with all permissions
        return {
          ...role.toJSON(),
          permissions: allPermissions
        } as any as MetaUserRole;
      }
      return role;
    })
  );

  return enrichedRoles;
};

export const getUserAccessProfile = async (userId: number): Promise<UserAccessProfile> => {
  const user = await User.findByPk(userId, {
    include: [
      {
        association: "roles",
        include: [{ model: MetaPermission, as: "permissions" }]
      }
    ]
  });

  if (!user) {
    return { roles: [], permissions: [] };
  }

  const roles = user.roles ?? [];
  const roleNames = roles.map((role) => role.dispName);

  // If user has Admin role, grant all permissions
  if (hasAdminRole(roles)) {
    const allPermissions = await MetaPermission.findAll({
      where: { status: 1 }
    });

    return {
      roles: roleNames,
      permissions: allPermissions.map((permission) => permission.dispName)
    };
  }

  // For non-admin users, collect permissions from their roles
  const permissionsSet = new Set<string>();

  roles.forEach((role) => {
    role.permissions?.forEach((permission) => {
      permissionsSet.add(permission.dispName);
    });
  });

  return {
    roles: roleNames,
    permissions: Array.from(permissionsSet)
  };
};
