import type { Request, Response } from "express";

import MetaPermission from "../models/MetaPermission";
import MetaUserRole from "../models/MetaUserRole";
import RolePermission from "../models/RolePermission";
import asyncHandler from "../utils/asyncHandler";
import { ApiError } from "../middlewares/errorHandler";
import User from "../models/User";
import UserRole from "../models/UserRole";
import { parseRoleIdsInput, resolveRoleIdsOrDefault, setUserRoles } from "../services/rbacService";
import {
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendNotFound,
  sendBadRequest
} from "../utils/apiResponse";
import { assertNoRestrictedFields } from "../utils/payloadValidation";

export const listRoles = asyncHandler(async (_req: Request, res: Response) => {
  const roles = await MetaUserRole.findAll({
    include: [
      { model: MetaPermission, as: "permissions" },
      { model: MetaUserRole, as: "parentRole", attributes: ["id", "dispName"] },
      { model: MetaUserRole, as: "childRoles", attributes: ["id", "dispName"] }
    ]
  });

  return sendSuccess(res, roles, "Roles retrieved successfully");
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

  return sendSuccess(res, role, "Role retrieved successfully");
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

  return sendSuccess(res, role.permissions, "Role permissions retrieved successfully");
});

export const createRole = asyncHandler(async (req: Request, res: Response) => {
  assertNoRestrictedFields(req.body);

  const { dispName, description, metaUserRoleId, permissions = [] } = req.body;
  if (!dispName) {
    throw new ApiError("dispName is required", 400);
  }

  // Validate parent role if provided
  if (metaUserRoleId) {
    const parentRole = await MetaUserRole.findByPk(metaUserRoleId);
    if (!parentRole) {
      throw new ApiError("Parent role not found", 404);
    }
  }

  const role = await MetaUserRole.create({
    dispName,
    description,
    metaUserRoleId: metaUserRoleId || null,
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

  return sendCreated(res, created, "Role created successfully");
});

export const updateRole = asyncHandler(async (req: Request, res: Response) => {
  assertNoRestrictedFields(req.body);

  const { permissions, metaUserRoleId, ...rolePayload } = req.body;
  const role = await MetaUserRole.findByPk(req.params.id);
  if (!role) {
    return sendNotFound(res, "Role not found", "role");
  }

  // Validate parent role if provided
  if (metaUserRoleId !== undefined) {
    if (metaUserRoleId === null) {
      // Allow setting to null
      rolePayload.metaUserRoleId = null;
    } else {
      const parentRole = await MetaUserRole.findByPk(metaUserRoleId);
      if (!parentRole) {
        throw new ApiError("Parent role not found", 404);
      }
      // Prevent circular reference
      if (metaUserRoleId === role.id) {
        throw new ApiError("A role cannot be its own parent", 400);
      }
      rolePayload.metaUserRoleId = metaUserRoleId;
    }
  }

  await role.update(rolePayload);

  if (Array.isArray(permissions)) {
    await RolePermission.destroy({ where: { roleId: role.id } });
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

  return sendSuccess(res, updated, "Role updated successfully");
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
      { association: "profile" },
      { association: "roles", include: [{ association: "permissions" }] }
    ]
  });

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

  await existingAssignment.destroy();

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
      { association: "profile" },
      { association: "roles", include: [{ association: "permissions" }] }
    ]
  });

  return sendSuccess(res, updatedUser, "Role unassigned from user successfully");
});
