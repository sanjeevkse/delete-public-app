import type { Request, Response } from "express";

import MetaPermission from "../models/MetaPermission";
import MetaUserRole from "../models/MetaUserRole";
import RolePermission from "../models/RolePermission";
import asyncHandler from "../utils/asyncHandler";
import { ApiError } from "../middlewares/errorHandler";
import User from "../models/User";
import UserRole from "../models/UserRole";
import {
  parseRoleIdsInput,
  resolveRoleIdsOrDefault,
  setUserRoles,
  hasAdminRole,
  enrichAdminRolePermissions
} from "../services/rbacService";
import {
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendNotFound,
  sendBadRequest,
  parsePaginationParams,
  validateSortColumn,
  calculatePagination,
  sendSuccessWithPagination,
  parseSortDirection
} from "../utils/apiResponse";
import { assertNoRestrictedFields } from "../utils/payloadValidation";

/**
 * Response helper for roles
 * Extracts parentId from depthPath for backward compatibility
 * depthPath format: /parentId/roleId or /roleId
 */
function getRoleResponse(data: any): any {
  if (!data) return data;

  if (Array.isArray(data)) {
    return data.map((item) => getRoleResponse(item));
  }

  if (data.toJSON && typeof data.toJSON === "function") {
    const json = data.toJSON();
    return getRoleResponse(json);
  }

  if (typeof data === "object") {
    let parentId: number | null = null;

    if (data.depthPath) {
      const parts = data.depthPath.split("/").filter((p: string) => p);
      // If there are 2+ parts, the second-to-last is the parent ID
      if (parts.length >= 2) {
        parentId = parseInt(parts[parts.length - 2], 10);
      }
    }

    return {
      ...data,
      parentId
    };
  }

  return data;
}
export const listRoles = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = parsePaginationParams(
    req.query.page as string,
    req.query.limit as string,
    10,
    100
  );
  const sortDirection = parseSortDirection(req.query.sort, "ASC");
  const sortColumn = validateSortColumn(
    req.query.sortColumn,
    ["id", "dispName", "createdAt"],
    "id"
  );

  // Get current user's roles with their depth paths
  const userRoles = await MetaUserRole.findAll({
    where: { id: (req as any).user?.roles || [] }
  });

  // Build filter condition: only show roles that are descendants of user's roles
  let where: any = { status: 1 };
  if (userRoles.length > 0) {
    const depthPathFilters = userRoles.map((role) => ({
      [require("sequelize").Op.or]: [
        { depthPath: { [require("sequelize").Op.like]: `${role.depthPath}/%` } }
      ]
    }));

    if (depthPathFilters.length > 0) {
      where = {
        ...where,
        [require("sequelize").Op.or]: depthPathFilters
          .flat()
          .map((f) => f[require("sequelize").Op.or])
          .flat()
      };
    }
  }

  const { rows: roles, count } = await MetaUserRole.findAndCountAll({
    where,
    include: [{ model: MetaPermission, as: "permissions" }],
    limit,
    offset,
    order: [[sortColumn, sortDirection]],
    distinct: true
  });

  // For Admin role, replace permissions with all permissions
  const rolesWithPermissions = await Promise.all(
    roles.map(async (role) => {
      if (hasAdminRole([role])) {
        const allPermissions = await MetaPermission.findAll({
          where: { status: 1 }
        });
        return {
          ...role.toJSON(),
          permissions: allPermissions
        };
      }
      return role;
    })
  );

  const pagination = calculatePagination(count, page, limit);
  return sendSuccessWithPagination(
    res,
    getRoleResponse(rolesWithPermissions),
    pagination,
    "Roles retrieved successfully"
  );
});

export const getRole = asyncHandler(async (req: Request, res: Response) => {
  const role = await MetaUserRole.findByPk(req.params.id, {
    include: [{ model: MetaPermission, as: "permissions" }]
  });

  if (!role) {
    return sendNotFound(res, "Role not found", "role");
  }

  // Check if user has access to this role (it must be a descendant of one of their roles)
  const userRoles = await MetaUserRole.findAll({
    where: { id: (req as any).user?.roles || [] }
  });

  const hasAccess = userRoles.some(
    (userRole) =>
      role.depthPath?.startsWith(`${userRole.depthPath}/`) || role.depthPath === userRole.depthPath
  );

  if (!hasAccess && userRoles.length > 0) {
    return sendNotFound(res, "Role not found", "role");
  }

  // For Admin role, replace permissions with all permissions
  if (hasAdminRole([role])) {
    const allPermissions = await MetaPermission.findAll({
      where: { status: 1 }
    });
    const roleWithAllPermissions = {
      ...role.toJSON(),
      permissions: allPermissions
    };
    return sendSuccess(res, getRoleResponse(roleWithAllPermissions), "Role retrieved successfully");
  }

  return sendSuccess(res, getRoleResponse(role), "Role retrieved successfully");
});

export const getRolePermissions = asyncHandler(async (req: Request, res: Response) => {
  const role = await MetaUserRole.findByPk(req.params.id, {
    include: [
      {
        model: MetaPermission,
        as: "permissions",
        include: [{ association: "group" }]
      }
    ]
  });

  if (!role) {
    return sendNotFound(res, "Role not found", "role");
  }

  // For Admin role, return all permissions
  if (hasAdminRole([role])) {
    const allPermissions = await MetaPermission.findAll({
      where: { status: 1 },
      include: [{ association: "group" }]
    });
    return sendSuccess(res, allPermissions, "Role permissions retrieved successfully");
  }

  return sendSuccess(res, role.permissions, "Role permissions retrieved successfully");
});

export const createRole = asyncHandler(async (req: Request, res: Response) => {
  assertNoRestrictedFields(req.body);

  const { dispName, description, parentId, permissions = [] } = req.body;
  if (!dispName) {
    throw new ApiError("dispName is required", 400);
  }

  let parentDepthPath: string | null = null;

  // Validate parent role if provided
  if (parentId) {
    const parentRole = await MetaUserRole.findByPk(parentId);
    if (!parentRole) {
      throw new ApiError("Parent role not found", 404);
    }
    parentDepthPath = parentRole.depthPath;
  }

  // Create role first to get its ID
  const role = await MetaUserRole.create({
    dispName,
    description,
    depthPath: null, // Will be set after we have the ID
    status: 1
  });

  // Calculate depthPath using the newly created role's ID
  let depthPath: string;
  if (parentDepthPath) {
    // Child role: append ID to parent's path
    depthPath = `${parentDepthPath}/${role.id}`;
  } else if (parentId) {
    // Parent is root (no depthPath yet): create path with parent ID and current ID
    depthPath = `/${parentId}/${role.id}`;
  } else {
    // Root role: just the role's ID
    depthPath = `/${role.id}`;
  }

  // Update the role with calculated depthPath
  await role.update({ depthPath });

  if (Array.isArray(permissions) && permissions.length > 0) {
    const payload = permissions.map((permissionId: number) => ({
      roleId: role.id,
      permissionId
    }));
    await RolePermission.bulkCreate(payload, { ignoreDuplicates: true });
  }

  const created = await MetaUserRole.findByPk(role.id, {
    include: [{ model: MetaPermission, as: "permissions" }]
  });

  // For Admin role, replace permissions with all permissions
  if (created && hasAdminRole([created])) {
    const allPermissions = await MetaPermission.findAll({
      where: { status: 1 }
    });
    const createdWithAllPermissions = {
      ...created.toJSON(),
      permissions: allPermissions
    };
    return sendCreated(
      res,
      getRoleResponse(createdWithAllPermissions),
      "Role created successfully"
    );
  }

  return sendCreated(res, getRoleResponse(created), "Role created successfully");
});

export const updateRole = asyncHandler(async (req: Request, res: Response) => {
  assertNoRestrictedFields(req.body);

  const { permissions, parentId, ...rolePayload } = req.body;
  const role = await MetaUserRole.findByPk(req.params.id);
  if (!role) {
    return sendNotFound(res, "Role not found", "role");
  }

  // Validate parent role if provided and calculate depthPath
  if (parentId !== undefined) {
    if (parentId === null) {
      // Root role: depthPath is just the role's ID
      rolePayload.depthPath = `/${role.id}`;
    } else {
      const parentRole = await MetaUserRole.findByPk(parentId);
      if (!parentRole) {
        throw new ApiError("Parent role not found", 404);
      }
      // Prevent circular reference
      if (parentId === role.id) {
        throw new ApiError("A role cannot be its own parent", 400);
      }
      // Calculate depthPath based on parent's depthPath and current role's ID
      if (parentRole.depthPath) {
        rolePayload.depthPath = `${parentRole.depthPath}/${role.id}`;
      } else {
        // Parent is root (no depthPath): create path with parent ID and current ID
        rolePayload.depthPath = `/${parentId}/${role.id}`;
      }
    }
  }

  await role.update(rolePayload);

  if (Array.isArray(permissions)) {
    // Soft delete existing role permissions
    await RolePermission.update({ status: 0 }, { where: { roleId: role.id } });
    if (permissions.length > 0) {
      const payload = permissions.map((permissionId: number) => ({
        roleId: role.id,
        permissionId
      }));
      await RolePermission.bulkCreate(payload, { ignoreDuplicates: true });
    }
  }

  const updated = await MetaUserRole.findByPk(role.id, {
    include: [{ model: MetaPermission, as: "permissions" }]
  });

  // For Admin role, replace permissions with all permissions
  if (updated && hasAdminRole([updated])) {
    const allPermissions = await MetaPermission.findAll({
      where: { status: 1 }
    });
    const updatedWithAllPermissions = {
      ...updated.toJSON(),
      permissions: allPermissions
    };
    return sendSuccess(
      res,
      getRoleResponse(updatedWithAllPermissions),
      "Role updated successfully"
    );
  }

  return sendSuccess(res, getRoleResponse(updated), "Role updated successfully");
});

export const deleteRole = asyncHandler(async (req: Request, res: Response) => {
  const role = await MetaUserRole.findByPk(req.params.id);
  if (!role) {
    return sendNotFound(res, "Role not found", "role");
  }

  await role.update({ status: 0 });

  return sendNoContent(res);
});

export const assignRoleToUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findByPk(req.params.userId);
  if (!user) {
    return sendNotFound(res, "User not found", "user");
  }

  const { roleIds, roleId } = req.body;
  const normalizedInput =
    roleIds !== undefined ? roleIds : roleId !== undefined ? [roleId] : undefined;

  const parsedRoleIds = parseRoleIdsInput(normalizedInput);
  const resolvedRoleIds = await resolveRoleIdsOrDefault(parsedRoleIds);

  await setUserRoles(user.id, resolvedRoleIds);

  const updatedUser = await User.findByPk(user.id, {
    include: [
      {
        association: "profile",
        include: [
          { association: "gender", attributes: ["id", "dispName"], required: false },
          { association: "maritalStatus", attributes: ["id", "dispName"], required: false },
          { association: "wardNumber", attributes: ["id", "dispName"], required: false },
          { association: "boothNumber", attributes: ["id", "dispName"], required: false }
        ]
      },
      { association: "roles", include: [{ association: "permissions" }] }
    ]
  });

  // Enrich Admin roles with all permissions
  if (updatedUser && updatedUser.roles && updatedUser.roles.length > 0) {
    const enrichedRoles = await enrichAdminRolePermissions(updatedUser.roles);
    const enrichedUser = {
      ...updatedUser.toJSON(),
      roles: enrichedRoles
    };
    return sendSuccess(res, enrichedUser, "Role assigned to user successfully");
  }

  return sendSuccess(res, updatedUser, "Role assigned to user successfully");
});

export const unassignRoleFromUser = asyncHandler(async (req: Request, res: Response) => {
  const roleId = Number.parseInt(req.params.roleId, 10);
  if (!Number.isInteger(roleId) || roleId <= 0) {
    return sendBadRequest(res, "Invalid role id");
  }

  const userId = Number.parseInt(req.params.userId, 10);
  if (!Number.isInteger(userId) || userId <= 0) {
    return sendBadRequest(res, "Invalid user id");
  }

  const [role, user] = await Promise.all([MetaUserRole.findByPk(roleId), User.findByPk(userId)]);

  if (!role) {
    return sendNotFound(res, "Role not found", "role");
  }

  if (!user) {
    return sendNotFound(res, "User not found", "user");
  }

  const existingAssignment = await UserRole.findOne({ where: { userId, roleId } });
  if (!existingAssignment) {
    return sendNotFound(res, "Role is not assigned to the user");
  }

  // Soft delete: set status to 0
  await existingAssignment.update({ status: 0 });

  const remainingAssignments = await UserRole.findAll({ where: { userId } });
  if (remainingAssignments.length === 0) {
    const defaultRoleIds = await resolveRoleIdsOrDefault(null);
    const defaultRoleId = defaultRoleIds[0];
    await UserRole.create({
      userId,
      roleId: defaultRoleId,
      status: 1
    });
  }

  const updatedUser = await User.findByPk(userId, {
    include: [
      {
        association: "profile",
        include: [
          { association: "gender", attributes: ["id", "dispName"], required: false },
          { association: "maritalStatus", attributes: ["id", "dispName"], required: false },
          { association: "wardNumber", attributes: ["id", "dispName"], required: false },
          { association: "boothNumber", attributes: ["id", "dispName"], required: false }
        ]
      },
      { association: "roles", include: [{ association: "permissions" }] }
    ]
  });

  // Enrich Admin roles with all permissions
  if (updatedUser && updatedUser.roles && updatedUser.roles.length > 0) {
    const enrichedRoles = await enrichAdminRolePermissions(updatedUser.roles);
    const enrichedUser = {
      ...updatedUser.toJSON(),
      roles: enrichedRoles
    };
    return sendSuccess(res, enrichedUser, "Role unassigned from user successfully");
  }

  return sendSuccess(res, updatedUser, "Role unassigned from user successfully");
});
export const assignPermissionToRole = asyncHandler(async (req: Request, res: Response) => {
  const { roleId } = req.params;
  const { permissionIds } = req.body;

  if (!Array.isArray(permissionIds) || permissionIds.length === 0) {
    throw new ApiError("permissionIds must be a non-empty array", 400);
  }

  const role = await MetaUserRole.findByPk(roleId);
  if (!role) {
    return sendNotFound(res, "Role not found", "role");
  }

  // Check if all permissions exist
  const permissions = await MetaPermission.findAll({
    where: { id: permissionIds, status: 1 }
  });

  if (permissions.length !== permissionIds.length) {
    throw new ApiError("One or more permissions not found", 404);
  }

  // Create role-permission mappings
  const payload = permissionIds.map((permissionId: number) => ({
    roleId: Number(roleId),
    permissionId,
    status: 1
  }));

  await RolePermission.bulkCreate(payload, {
    updateOnDuplicate: ["status"]
  });

  const updated = await MetaUserRole.findByPk(roleId, {
    include: [
      {
        model: MetaPermission,
        as: "permissions",
        include: [{ association: "group" }]
      }
    ]
  });

  return sendSuccess(res, getRoleResponse(updated), "Permissions assigned to role successfully");
});

export const removePermissionFromRole = asyncHandler(async (req: Request, res: Response) => {
  const { roleId, permissionId } = req.params;

  const [role, permission] = await Promise.all([
    MetaUserRole.findByPk(roleId),
    MetaPermission.findByPk(permissionId)
  ]);

  if (!role) {
    return sendNotFound(res, "Role not found", "role");
  }

  if (!permission) {
    return sendNotFound(res, "Permission not found", "permission");
  }

  const rolePermission = await RolePermission.findOne({
    where: { roleId, permissionId }
  });

  if (!rolePermission) {
    return sendNotFound(res, "This permission is not assigned to this role");
  }

  await rolePermission.update({ status: 0 });

  const updated = await MetaUserRole.findByPk(roleId, {
    include: [
      {
        model: MetaPermission,
        as: "permissions",
        include: [{ association: "group" }]
      }
    ]
  });

  return sendSuccess(res, getRoleResponse(updated), "Permission removed from role successfully");
});

export const getAllPermissionsGrouped = asyncHandler(async (req: Request, res: Response) => {
  const permissions = await MetaPermission.findAll({
    where: { status: 1 },
    include: [
      {
        association: "group",
        attributes: ["id", "label"]
      }
    ],
    order: [
      ["permissionGroupId", "ASC"],
      ["dispName", "ASC"]
    ]
  });

  // Group permissions by group
  const grouped = permissions.reduce((acc: Record<string, any>, permission: any) => {
    const groupName = permission.group?.label || "Ungrouped";
    if (!acc[groupName]) {
      acc[groupName] = [];
    }
    acc[groupName].push(permission);
    return acc;
  }, {});

  return sendSuccess(res, grouped, "Permissions retrieved and grouped successfully");
});
