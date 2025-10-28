import type { Request, Response } from "express";
import { Op } from "sequelize";

import { AppEvent, emitEvent } from "../events/eventBus";
import { PUBLIC_ROLE_NAME } from "../config/rbac";
import { ApiError } from "../middlewares/errorHandler";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import User from "../models/User";
import UserProfile from "../models/UserProfile";
import {
  getRoleByName,
  parseRoleIdsInput,
  resolveRoleIdsOrDefault,
  setUserRoles
} from "../services/rbacService";
import { buildProfileAttributes } from "../services/userProfileService";
import asyncHandler from "../utils/asyncHandler";
import {
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendNotFound,
  sendSuccessWithPagination,
  parsePaginationParams,
  calculatePagination
} from "../utils/apiResponse";

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = parsePaginationParams(
    req.query.page as string,
    req.query.limit as string,
    25,
    100
  );
  const search = (req.query.search as string) ?? "";

  const { rows, count } = await User.findAndCountAll({
    where: search
      ? {
          [Op.or]: [
            { contactNumber: { [Op.like]: `%${search}%` } },
            { fullName: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } }
          ]
        }
      : undefined,
    include: [
      { model: UserProfile, as: "profile" },
      { association: "roles", include: [{ association: "permissions" }] }
    ],
    limit,
    offset,
    order: [["createdAt", "DESC"]]
  });

  const pagination = calculatePagination(count, page, limit);

  return sendSuccessWithPagination(res, rows, pagination, "Users retrieved successfully");
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const { contactNumber, email, fullName, status = 1, profile, roleIds: roleIdsInput } = req.body;
  if (!contactNumber) {
    throw new ApiError("contactNumber is required", 400);
  }

  const parsedRoleIds = parseRoleIdsInput(roleIdsInput);
  const publicRole = await getRoleByName(PUBLIC_ROLE_NAME);
  if (!publicRole) {
    throw new ApiError("Default public role is not configured", 500);
  }

  const user = await User.create({
    contactNumber,
    email,
    fullName,
    status
  });

  if (profile) {
    const profileAttributes = buildProfileAttributes(profile);
    if (Object.keys(profileAttributes).length > 0) {
      await UserProfile.create({
        userId: user.id,
        ...profileAttributes
      });
    }
  }

  const combinedRoleIds = Array.from(new Set([...(parsedRoleIds ?? []), publicRole.id]));
  const resolvedRoleIds = await resolveRoleIdsOrDefault(combinedRoleIds);
  await setUserRoles(user.id, resolvedRoleIds);

  const actorId = (req as AuthenticatedRequest).user?.id;
  emitEvent(AppEvent.USER_CREATED, { userId: user.id, actorId: actorId ?? user.id });

  const created = await User.findByPk(user.id, {
    include: [
      { model: UserProfile, as: "profile" },
      { association: "roles", include: [{ association: "permissions" }] }
    ]
  });

  return sendCreated(res, created, "User created successfully");
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findByPk(req.params.id, {
    include: [
      { model: UserProfile, as: "profile" },
      { association: "roles", include: [{ association: "permissions" }] }
    ]
  });

  if (!user) {
    return sendNotFound(res, "User not found", "user");
  }

  return sendSuccess(res, user, "User retrieved successfully");
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findByPk(req.params.id, {
    include: [
      { model: UserProfile, as: "profile" },
      { association: "roles", include: [{ association: "permissions" }] }
    ]
  });

  if (!user) {
    throw new ApiError("User not found", 404);
  }

  const { profile, roleIds: roleIdsInput, ...userUpdates } = req.body;
  const parsedRoleIds = parseRoleIdsInput(roleIdsInput);

  await user.update(userUpdates);

  if (profile) {
    const profileAttributes = buildProfileAttributes(profile, user.profile ?? undefined);
    if (Object.keys(profileAttributes).length > 0) {
      if (user.profile) {
        await user.profile.update(profileAttributes);
      } else {
        await UserProfile.create({ userId: user.id, ...profileAttributes });
      }
    }
  }

  if (roleIdsInput !== undefined) {
    const resolvedRoleIds = await resolveRoleIdsOrDefault(parsedRoleIds);
    await setUserRoles(user.id, resolvedRoleIds);
  }

  const actorId = (req as AuthenticatedRequest).user?.id;
  emitEvent(AppEvent.USER_UPDATED, { userId: user.id, actorId: actorId ?? user.id });

  const updated = await User.findByPk(user.id, {
    include: [
      { model: UserProfile, as: "profile" },
      { association: "roles", include: [{ association: "permissions" }] }
    ]
  });

  return sendSuccess(res, updated, "User updated successfully");
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findByPk(req.params.id);

  if (!user) {
    return sendNotFound(res, "User not found", "user");
  }

  await user.update({ status: 0 });

  return sendNoContent(res);
});
