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
 * Transform metaUserRoleId to parentId in response
 */
function transformRoleResponse(data: any): any {
  if (!data) return data;

  if (Array.isArray(data)) {
    return data.map((item) => transformRoleResponse(item));
  }

  if (data.toJSON && typeof data.toJSON === "function") {
    const json = data.toJSON();
    return transformRoleResponse(json);
  }

  if (typeof data === "object") {
    const transformed = { ...data };
    if ("metaUserRoleId" in transformed) {
      transformed.parentId = transformed.metaUserRoleId;
      delete transformed.metaUserRoleId;
    }
    return transformed;
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

  const { rows: roles, count } = await MetaUserRole.findAndCountAll({
    include: [
      { model: MetaPermission, as: "permissions" },
      { model: MetaUserRole, as: "parentRole", attributes: ["id", "dispName"] },
      { model: MetaUserRole, as: "childRoles", attributes: ["id", "dispName"] }
    ],
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
    transformRoleResponse(rolesWithPermissions),
    pagination,
    "Roles retrieved successfully"
  );
});

export const getRole = asyncHandler(async (req: Request, res: Response) => {
  const role = await MetaUserRole.findByPk(req.params.id, {
    include: [
      { model: MetaPermission, as: "permissions" },
      { model: MetaUserRole, as: "parentRole", attributes: ["id", "dispName"] },
      { model: MetaUserRole, as: "childRoles", attributes: ["id", "dispName"] }
    ]
  });

  if (!role) {
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
    return sendSuccess(
      res,
      transformRoleResponse(roleWithAllPermissions),
      "Role retrieved successfully"
    );
  }

  return sendSuccess(res, transformRoleResponse(role), "Role retrieved successfully");
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

  // Validate parent role if provided
  if (parentId) {
    const parentRole = await MetaUserRole.findByPk(parentId);
    if (!parentRole) {
      throw new ApiError("Parent role not found", 404);
    }
  }

  const role = await MetaUserRole.create({
    dispName,
    description,
    metaUserRoleId: parentId || null,
    status: 1
  });

  if (Array.isArray(permissions) && permissions.length > 0) {
    const payload = permissions.map((permissionId: number) => ({
      roleId: role.id,
      permissionId
    }));
    await RolePermission.bulkCreate(payload, { ignoreDuplicates: true });
  }

  const created = await MetaUserRole.findByPk(role.id, {
    include: [
      { model: MetaPermission, as: "permissions" },
      { model: MetaUserRole, as: "parentRole", attributes: ["id", "dispName"] }
    ]
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
      transformRoleResponse(createdWithAllPermissions),
      "Role created successfully"
    );
  }

  return sendCreated(res, transformRoleResponse(created), "Role created successfully");
});

export const updateRole = asyncHandler(async (req: Request, res: Response) => {
  assertNoRestrictedFields(req.body);

  const { permissions, parentId, ...rolePayload } = req.body;
  const role = await MetaUserRole.findByPk(req.params.id);
  if (!role) {
    return sendNotFound(res, "Role not found", "role");
  }

  // Validate parent role if provided
  if (parentId !== undefined) {
    if (parentId === null) {
      // Allow setting to null
      rolePayload.metaUserRoleId = null;
    } else {
      const parentRole = await MetaUserRole.findByPk(parentId);
      if (!parentRole) {
        throw new ApiError("Parent role not found", 404);
      }
      // Prevent circular reference
      if (parentId === role.id) {
        throw new ApiError("A role cannot be its own parent", 400);
      }
      rolePayload.metaUserRoleId = parentId;
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
    include: [
      { model: MetaPermission, as: "permissions" },
      { model: MetaUserRole, as: "parentRole", attributes: ["id", "dispName"] },
      { model: MetaUserRole, as: "childRoles", attributes: ["id", "dispName"] }
    ]
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
      transformRoleResponse(updatedWithAllPermissions),
      "Role updated successfully"
    );
  }

  return sendSuccess(res, transformRoleResponse(updated), "Role updated successfully");
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

  return sendSuccess(
    res,
    transformRoleResponse(updated),
    "Permissions assigned to role successfully"
  );
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

  return sendSuccess(
    res,
    transformRoleResponse(updated),
    "Permission removed from role successfully"
  );
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
