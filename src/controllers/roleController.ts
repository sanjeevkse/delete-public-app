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

export const listRoles = asyncHandler(async (_req: Request, res: Response) => {
  const roles = await MetaUserRole.findAll({
    include: [{ model: MetaPermission, as: "permissions" }]
  });

  return sendSuccess(res, roles, "Roles retrieved successfully");
});

export const createRole = asyncHandler(async (req: Request, res: Response) => {
  const { dispName, description, status = 1, permissions = [] } = req.body;
  if (!dispName) {
    throw new ApiError("dispName is required", 400);
  }

  const role = await MetaUserRole.create({
    dispName,
    description,
    status
  });

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

  return sendCreated(res, created, "Role created successfully");
});

export const updateRole = asyncHandler(async (req: Request, res: Response) => {
  const { permissions, ...rolePayload } = req.body;
  const role = await MetaUserRole.findByPk(req.params.id);
  if (!role) {
    return sendNotFound(res, "Role not found", "role");
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
    include: [{ model: MetaPermission, as: "permissions" }]
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
