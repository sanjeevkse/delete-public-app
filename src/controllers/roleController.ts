import type { Request, Response } from "express";

import MetaPermission from "../models/MetaPermission";
import MetaUserRole from "../models/MetaUserRole";
import RolePermission from "../models/RolePermission";
import asyncHandler from "../utils/asyncHandler";
import { ApiError } from "../middlewares/errorHandler";
import User from "../models/User";
import {
  parseRoleIdsInput,
  resolveRoleIdsOrDefault,
  setUserRoles
} from "../services/rbacService";

export const listRoles = asyncHandler(async (_req: Request, res: Response) => {
  const roles = await MetaUserRole.findAll({
    include: [{ model: MetaPermission, as: "permissions" }]
  });

  res.json(roles);
});

export const createRole = asyncHandler(async (req: Request, res: Response) => {
  const { dispName, description, status = 1, metaUserRoleId, permissions = [] } = req.body;
  if (!dispName) {
    throw new ApiError("dispName is required", 400);
  }

  const role = await MetaUserRole.create({
    dispName,
    description,
    status,
    metaUserRoleId
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

  res.status(201).json(created);
});

export const updateRole = asyncHandler(async (req: Request, res: Response) => {
  const { permissions, ...rolePayload } = req.body;
  const role = await MetaUserRole.findByPk(req.params.id);
  if (!role) {
    throw new ApiError("Role not found", 404);
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

  res.json(updated);
});

export const deleteRole = asyncHandler(async (req: Request, res: Response) => {
  const role = await MetaUserRole.findByPk(req.params.id);
  if (!role) {
    throw new ApiError("Role not found", 404);
  }

  await role.update({ status: 0 });

  res.status(204).send();
});

export const assignRoleToUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findByPk(req.params.userId);
  if (!user) {
    throw new ApiError("User not found", 404);
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

  res.status(200).json(updatedUser);
});
