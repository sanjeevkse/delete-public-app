import type { Request, Response } from "express";
import { Op } from "sequelize";

import { AppEvent, emitEvent } from "../events/eventBus";
import { PUBLIC_ROLE_NAME } from "../config/rbac";
import { ApiError } from "../middlewares/errorHandler";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import User from "../models/User";
import UserProfile from "../models/UserProfile";
import UserAccess from "../models/UserAccess";
import {
  getRoleByName,
  parseRoleIdsInput,
  resolveRoleIdsOrDefault,
  setUserRoles
} from "../services/rbacService";
import { buildProfileAttributes } from "../services/userProfileService";
import {
  createUserAccessProfiles,
  updateUserAccessProfiles,
  validateAccessibles
} from "../services/userAccessService";
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
import { buildQueryAttributes, shouldIncludeAuditFields } from "../utils/queryAttributes";
import { assertNoRestrictedFields } from "../utils/payloadValidation";

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = parsePaginationParams(
    req.query.page as string,
    req.query.limit as string,
    25,
    100
  );
  const search = (req.query.search as string) ?? "";
  const includeAuditFields = shouldIncludeAuditFields(req.query);

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
    attributes: buildQueryAttributes({ includeAuditFields, keepFields: ["createdAt"] }),
    include: [
      { model: UserProfile, as: "profile" },
      { association: "roles", include: [{ association: "permissions" }] },
      {
        model: UserAccess,
        as: "accessProfiles",
        where: { status: 1 },
        required: false,
        include: [
          { association: "accessRole" },
          { association: "wardNumber" },
          { association: "boothNumber" },
          { association: "mlaConstituency" }
        ]
      }
    ],
    limit,
    offset,
    order: [["createdAt", "DESC"]]
  });

  const pagination = calculatePagination(count, page, limit);

  return sendSuccessWithPagination(res, rows, pagination, "Users retrieved successfully");
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  assertNoRestrictedFields(req.body);

  const { contactNumber, email, fullName, profile, roleIds: roleIdsInput, accessibles } = req.body;
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
    status: 1
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

  // Handle accessibles if provided
  if (accessibles) {
    const validatedAccessibles = validateAccessibles(accessibles);
    const actorId = (req as AuthenticatedRequest).user?.id ?? user.id;
    // Use the first role as access role, or public role if no roles provided
    const accessRoleId = parsedRoleIds?.[0] ?? publicRole.id;
    await createUserAccessProfiles(user.id, accessRoleId, validatedAccessibles, actorId);
  }

  const actorId = (req as AuthenticatedRequest).user?.id;
  emitEvent(AppEvent.USER_CREATED, { userId: user.id, actorId: actorId ?? user.id });

  const created = await User.findByPk(user.id, {
    include: [
      { model: UserProfile, as: "profile" },
      { association: "roles", include: [{ association: "permissions" }] },
      {
        model: UserAccess,
        as: "accessProfiles",
        where: { status: 1 },
        required: false,
        include: [
          { association: "accessRole" },
          { association: "wardNumber" },
          { association: "boothNumber" },
          { association: "mlaConstituency" }
        ]
      }
    ]
  });

  return sendCreated(res, created, "User created successfully");
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const includeAuditFields = shouldIncludeAuditFields(req.query);

  const user = await User.findByPk(req.params.id, {
    attributes: buildQueryAttributes({ includeAuditFields }),
    include: [
      { model: UserProfile, as: "profile" },
      { association: "roles", include: [{ association: "permissions" }] },
      {
        model: UserAccess,
        as: "accessProfiles",
        where: { status: 1 },
        required: false,
        include: [
          { association: "accessRole" },
          { association: "wardNumber" },
          { association: "boothNumber" },
          { association: "mlaConstituency" }
        ]
      }
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

  assertNoRestrictedFields(req.body, { allow: ["status"] });

  if (Object.prototype.hasOwnProperty.call(req.body, "status")) {
    throw new ApiError("Status must be updated using the status endpoint", 400);
  }

  const {
    profile,
    roleIds: roleIdsInput,
    accessibles,
    status: _ignoredStatus,
    ...userUpdates
  } = req.body;
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

  // Handle accessibles update if provided
  if (accessibles !== undefined) {
    const validatedAccessibles = validateAccessibles(accessibles);
    const actorId = (req as AuthenticatedRequest).user?.id ?? user.id;
    // Use the first role as access role, or get from existing roles
    const accessRoleId =
      parsedRoleIds?.[0] ?? user.roles?.[0]?.id ?? (await getRoleByName(PUBLIC_ROLE_NAME))?.id;
    if (!accessRoleId) {
      throw new ApiError("Cannot determine access role for user", 500);
    }
    await updateUserAccessProfiles(user.id, accessRoleId, validatedAccessibles, actorId);
  }

  const actorId = (req as AuthenticatedRequest).user?.id;
  emitEvent(AppEvent.USER_UPDATED, { userId: user.id, actorId: actorId ?? user.id });

  const updated = await User.findByPk(user.id, {
    include: [
      { model: UserProfile, as: "profile" },
      { association: "roles", include: [{ association: "permissions" }] },
      {
        model: UserAccess,
        as: "accessProfiles",
        where: { status: 1 },
        required: false,
        include: [
          { association: "accessRole" },
          { association: "wardNumber" },
          { association: "boothNumber" },
          { association: "mlaConstituency" }
        ]
      }
    ]
  });

  return sendSuccess(res, updated, "User updated successfully");
});

export const updateUserStatus = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findByPk(req.params.id);

  if (!user) {
    throw new ApiError("User not found", 404);
  }

  const action = typeof req.body?.action === "string" ? req.body.action.toLowerCase() : "";

  if (action !== "activate" && action !== "deactivate") {
    throw new ApiError("Invalid action. Allowed values are 'activate' or 'deactivate'.", 400);
  }

  const targetStatus = action === "activate" ? 1 : 0;

  if (user.status === targetStatus) {
    const hydrated = await User.findByPk(user.id, {
      include: [
        { model: UserProfile, as: "profile" },
        { association: "roles", include: [{ association: "permissions" }] },
        {
          model: UserAccess,
          as: "accessProfiles",
          where: { status: 1 },
          required: false,
          include: [
            { association: "accessRole" },
            { association: "wardNumber" },
            { association: "boothNumber" },
            { association: "mlaConstituency" }
          ]
        }
      ]
    });

    const message =
      targetStatus === 1 ? "User is already active" : "User is already inactive/deactivated";
    return sendSuccess(res, hydrated, message);
  }

  const actorId = (req as AuthenticatedRequest).user?.id ?? null;
  await user.update({ status: targetStatus, updatedBy: actorId });
  emitEvent(AppEvent.USER_UPDATED, { userId: user.id, actorId: actorId ?? user.id });

  const updated = await User.findByPk(user.id, {
    include: [
      { model: UserProfile, as: "profile" },
      { association: "roles", include: [{ association: "permissions" }] },
      {
        model: UserAccess,
        as: "accessProfiles",
        where: { status: 1 },
        required: false,
        include: [
          { association: "accessRole" },
          { association: "wardNumber" },
          { association: "boothNumber" },
          { association: "mlaConstituency" }
        ]
      }
    ]
  });

  const message =
    targetStatus === 1 ? "User activated successfully" : "User deactivated successfully";
  return sendSuccess(res, updated, message);
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findByPk(req.params.id);

  if (!user) {
    return sendNotFound(res, "User not found", "user");
  }

  await user.update({ status: 0 });

  return sendNoContent(res);
});
