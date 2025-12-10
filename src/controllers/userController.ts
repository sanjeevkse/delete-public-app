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
  setUserRoles,
  enrichAdminRolePermissions
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

type QueryRecord = Record<string, unknown>;

const firstQueryValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.length > 0 ? value[0] : undefined;
  }
  return value;
};

const resolveNestedValue = (source: unknown, segments: string[]): unknown => {
  let current: unknown = source;

  for (const segment of segments) {
    if (current === undefined || current === null) {
      return undefined;
    }

    if (Array.isArray(current)) {
      current = current[0];
    }

    if (typeof current !== "object") {
      return undefined;
    }

    current = (current as QueryRecord)[segment];
  }

  return current;
};

const pickQueryValue = (query: QueryRecord, candidates: string[]): unknown => {
  for (const candidate of candidates) {
    if (Object.prototype.hasOwnProperty.call(query, candidate)) {
      const direct = firstQueryValue(query[candidate]);
      if (direct !== undefined) {
        return direct;
      }
    }

    const nested = resolveNestedValue(query, candidate.split("."));
    const normalized = firstQueryValue(nested);
    if (normalized !== undefined) {
      return normalized;
    }
  }

  return undefined;
};

const parseStringFilter = (value: unknown): string | undefined => {
  const normalized = firstQueryValue(value);
  if (normalized === undefined || normalized === null) {
    return undefined;
  }

  const result = String(normalized).trim();
  return result ? result : undefined;
};

const parseNumberFilter = (value: unknown): number | undefined => {
  const normalized = firstQueryValue(value);
  if (normalized === undefined || normalized === null || normalized === "") {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseBooleanFilter = (value: unknown): boolean | undefined => {
  const normalized = firstQueryValue(value);
  if (normalized === undefined || normalized === null || normalized === "") {
    return undefined;
  }

  if (typeof normalized === "boolean") {
    return normalized;
  }

  if (typeof normalized === "number") {
    if (normalized === 1) {
      return true;
    }
    if (normalized === 0) {
      return false;
    }
  }

  const normalizedStr = String(normalized).trim().toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(normalizedStr)) {
    return true;
  }
  if (["false", "0", "no", "n", "off"].includes(normalizedStr)) {
    return false;
  }
  return undefined;
};

const parseDateFilter = (value: unknown): string | undefined => {
  const normalized = parseStringFilter(value);
  if (!normalized) {
    return undefined;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return normalized;
};

const parseNumberListFilter = (value: unknown): number[] | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const rawValues = Array.isArray(value)
    ? value
    : String(value)
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);

  const numbers = rawValues
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry)) as number[];

  if (numbers.length === 0) {
    return undefined;
  }

  return Array.from(new Set(numbers));
};

const applyRangeFilter = (
  target: Record<string, unknown>,
  field: string,
  start?: string | number,
  end?: string | number
): void => {
  if (start === undefined && end === undefined) {
    return;
  }

  target[field] = {
    ...(start !== undefined ? { [Op.gte]: start } : {}),
    ...(end !== undefined ? { [Op.lte]: end } : {})
  };
};

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = parsePaginationParams(
    req.query.page as string,
    req.query.limit as string,
    25,
    100
  );
  const queryParams = req.query as QueryRecord;
  const search = parseStringFilter(pickQueryValue(queryParams, ["search"])) ?? "";

  const contactNumberFilter = parseStringFilter(
    pickQueryValue(queryParams, ["contactNumber", "contact_number"])
  );
  const userIdFilter = parseNumberFilter(pickQueryValue(queryParams, ["id", "userId", "user_id"]));
  const userEmailFilter = parseStringFilter(pickQueryValue(queryParams, ["email"]));
  const userFullNameFilter = parseStringFilter(
    pickQueryValue(queryParams, ["fullName", "full_name"])
  );
  const userStatusFilters = parseNumberListFilter(queryParams.status);

  const dateOfBirthStart = parseDateFilter(
    pickQueryValue(queryParams, ["dateOfBirthStart", "date_of_birth_start"])
  );
  const dateOfBirthEnd = parseDateFilter(
    pickQueryValue(queryParams, ["dateOfBirthEnd", "date_of_birth_end"])
  );
  const citizenAgeStart = parseNumberFilter(
    pickQueryValue(queryParams, ["citizenAgeStart", "citizen_age_start"])
  );
  const citizenAgeEnd = parseNumberFilter(
    pickQueryValue(queryParams, ["citizenAgeEnd", "citizen_age_end"])
  );
  const genderFilter = parseNumberFilter(pickQueryValue(queryParams, ["genderId", "gender_id"]));
  const maritalStatusFilter = parseNumberFilter(
    pickQueryValue(queryParams, ["maritalStatusId", "marital_status_id"])
  );
  const occupationFilter = parseStringFilter(pickQueryValue(queryParams, ["occupation"]));
  const cityFilter = parseStringFilter(pickQueryValue(queryParams, ["city"]));
  const stateFilter = parseStringFilter(pickQueryValue(queryParams, ["state"]));
  const postalCodeFilter = parseStringFilter(
    pickQueryValue(queryParams, ["postalCode", "postal_code"])
  );
  const wardNumberFilter = parseNumberFilter(
    pickQueryValue(queryParams, ["wardNumberId", "ward_number_id"])
  );
  const boothNumberFilter = parseNumberFilter(
    pickQueryValue(queryParams, ["boothNumberId", "booth_number_id"])
  );
  const sectorFilter = parseNumberFilter(pickQueryValue(queryParams, ["sectorId", "sector_id"]));
  const postsBlockedFilter = parseBooleanFilter(
    pickQueryValue(queryParams, ["postsBlocked", "posts_blocked"])
  );
  const referredByFilter = parseStringFilter(
    pickQueryValue(queryParams, ["referredBy", "referred_by"])
  );
  const educationalDetailFilter = parseNumberFilter(
    pickQueryValue(queryParams, ["educationalDetailId", "educational_detail_id"])
  );
  const educationalDetailGroupFilter = parseNumberFilter(
    pickQueryValue(queryParams, ["educationalDetailGroupId", "educational_detail_group_id"])
  );
  const dateOfJoiningStart = parseDateFilter(
    pickQueryValue(queryParams, ["dateOfJoiningStart", "date_of_joining_start"])
  );
  const dateOfJoiningEnd = parseDateFilter(
    pickQueryValue(queryParams, ["dateOfJoiningEnd", "date_of_joining_end"])
  );

  // Parse roleId - accepts array format like roleId=[1,2,3]
  let roleIds: number[] | undefined;
  const roleIdInput = req.query.roleId;

  if (roleIdInput) {
    try {
      // Handle array format: roleId=[1,2,3] or roleId=1 or roleId=1&roleId=2
      const parsedIds = parseRoleIdsInput(roleIdInput);
      roleIds = parsedIds ?? undefined;
    } catch (error) {
      // If parsing fails, try single number conversion as fallback
      const singleId = Number(roleIdInput);
      if (!Number.isNaN(singleId) && singleId > 0) {
        roleIds = [singleId];
      }
    }
  }

  const includeAuditFields = shouldIncludeAuditFields(req.query);

  const userFilters: Record<string, unknown> = {};
  if (userIdFilter !== undefined) {
    userFilters.id = userIdFilter;
  }
  if (contactNumberFilter) {
    userFilters.contactNumber = contactNumberFilter;
  }
  if (userEmailFilter) {
    userFilters.email = { [Op.like]: `%${userEmailFilter}%` };
  }
  if (userFullNameFilter) {
    userFilters.fullName = { [Op.like]: `%${userFullNameFilter}%` };
  }
  if (userStatusFilters && userStatusFilters.length > 0) {
    userFilters.status =
      userStatusFilters.length === 1 ? userStatusFilters[0] : { [Op.in]: userStatusFilters };
  }

  const profileFilters: Record<string, unknown> = {};
  applyRangeFilter(profileFilters, "dateOfBirth", dateOfBirthStart, dateOfBirthEnd);
  applyRangeFilter(profileFilters, "citizenAge", citizenAgeStart, citizenAgeEnd);
  applyRangeFilter(profileFilters, "dateOfJoining", dateOfJoiningStart, dateOfJoiningEnd);

  if (genderFilter !== undefined) {
    profileFilters.genderId = genderFilter;
  }
  if (maritalStatusFilter !== undefined) {
    profileFilters.maritalStatusId = maritalStatusFilter;
  }
  if (occupationFilter) {
    profileFilters.occupation = { [Op.like]: `%${occupationFilter}%` };
  }
  if (cityFilter) {
    profileFilters.city = { [Op.like]: `%${cityFilter}%` };
  }
  if (stateFilter) {
    profileFilters.state = { [Op.like]: `%${stateFilter}%` };
  }
  if (postalCodeFilter) {
    profileFilters.postalCode = { [Op.like]: `%${postalCodeFilter}%` };
  }
  if (wardNumberFilter !== undefined) {
    profileFilters.wardNumberId = wardNumberFilter;
  }
  if (boothNumberFilter !== undefined) {
    profileFilters.boothNumberId = boothNumberFilter;
  }
  if (sectorFilter !== undefined) {
    profileFilters.sectorId = sectorFilter;
  }
  if (postsBlockedFilter !== undefined) {
    profileFilters.postsBlocked = postsBlockedFilter;
  }
  if (referredByFilter) {
    profileFilters.referredBy = { [Op.like]: `%${referredByFilter}%` };
  }
  if (educationalDetailFilter !== undefined) {
    profileFilters.educationalDetailId = educationalDetailFilter;
  }
  if (educationalDetailGroupFilter !== undefined) {
    profileFilters.educationalDetailGroupId = educationalDetailGroupFilter;
  }

  const profileFiltersApplied = Object.keys(profileFilters).length > 0;

  const whereClauses: Record<string, unknown>[] = [];
  if (Object.keys(userFilters).length > 0) {
    whereClauses.push(userFilters);
  }
  if (search) {
    whereClauses.push({
      [Op.or]: [
        { contactNumber: { [Op.like]: `%${search}%` } },
        { fullName: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ]
    });
  }

  const userWhere =
    whereClauses.length > 1 ? { [Op.and]: whereClauses } : (whereClauses[0] ?? undefined);

  const { rows, count } = await User.findAndCountAll({
    where: userWhere,
    attributes: buildQueryAttributes({ includeAuditFields, keepFields: ["createdAt"] }),
    include: [
      {
        model: UserProfile,
        as: "profile",
        ...(profileFiltersApplied && { where: profileFilters, required: true }),
        include: [
          { association: "gender", attributes: ["id", "dispName"], required: false },
          { association: "maritalStatus", attributes: ["id", "dispName"], required: false },
          { association: "wardNumber", attributes: ["id", "dispName"], required: false },
          { association: "boothNumber", attributes: ["id", "dispName"], required: false },
          { association: "educationalDetail", attributes: ["id", "dispName"], required: false },
          {
            association: "educationalDetailGroup",
            attributes: ["id", "dispName"],
            required: false
          },
          { association: "sector", attributes: ["id", "dispName"], required: false }
        ]
      },
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
      },
      {
        association: "roles",
        include: [{ association: "permissions" }],
        ...(roleIds &&
          roleIds.length > 0 && { where: { id: { [Op.in]: roleIds } }, required: true })
      }
    ],
    limit,
    offset,
    order: [["createdAt", "DESC"]],
    distinct: true
  });

  // Enrich Admin roles with all permissions
  const enrichedRows = await Promise.all(
    rows.map(async (user) => {
      if (user.roles && user.roles.length > 0) {
        const enrichedRoles = await enrichAdminRolePermissions(user.roles);
        return {
          ...user.toJSON(),
          roles: enrichedRoles.reverse()
        };
      }
      return user;
    })
  );

  const pagination = calculatePagination(count, page, limit);

  return sendSuccessWithPagination(res, enrichedRows, pagination, "Users retrieved successfully");
});

export const listUsersPendingApproval = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = parsePaginationParams(
    req.query.page as string,
    req.query.limit as string,
    25,
    100
  );
  const search = (req.query.search as string) ?? "";
  const includeAuditFields = shouldIncludeAuditFields(req.query);

  const whereClause: any = {
    status: 2
  };

  if (search) {
    whereClause[Op.or] = [
      { contactNumber: { [Op.like]: `%${search}%` } },
      { fullName: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } }
    ];
  }

  const { rows, count } = await User.findAndCountAll({
    where: whereClause,
    attributes: buildQueryAttributes({ includeAuditFields, keepFields: ["createdAt"] }),
    include: [
      {
        model: UserProfile,
        as: "profile",
        include: [
          { association: "gender", attributes: ["id", "dispName"], required: false },
          { association: "maritalStatus", attributes: ["id", "dispName"], required: false },
          { association: "wardNumber", attributes: ["id", "dispName"], required: false },
          { association: "boothNumber", attributes: ["id", "dispName"], required: false },
          { association: "educationalDetail", attributes: ["id", "dispName"], required: false },
          {
            association: "educationalDetailGroup",
            attributes: ["id", "dispName"],
            required: false
          },
          { association: "sector", attributes: ["id", "dispName"], required: false }
        ]
      },
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
      },
      {
        association: "roles",
        include: [{ association: "permissions" }]
      }
    ],
    limit,
    offset,
    order: [["createdAt", "DESC"]],
    distinct: true
  });

  const enrichedRows = await Promise.all(
    rows.map(async (user) => {
      if (user.roles && user.roles.length > 0) {
        const enrichedRoles = await enrichAdminRolePermissions(user.roles);
        return {
          ...user.toJSON(),
          roles: enrichedRoles.reverse()
        };
      }
      return user;
    })
  );

  const pagination = calculatePagination(count, page, limit);

  return sendSuccessWithPagination(
    res,
    enrichedRows,
    pagination,
    "Users pending approval retrieved successfully"
  );
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  assertNoRestrictedFields(req.body);

  const { contactNumber, email, fullName, profile, roleIds: roleIdsInput, accessibles } = req.body;
  if (!contactNumber) {
    throw new ApiError("contactNumber is required", 400);
  }

  // wardNumberId and boothNumberId can be provided either in profile or in accessible array
  // so we don't require them here - validation happens per context

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
      // wardNumberId and boothNumberId are optional in profile
      // they can be provided separately in the accessible array
      const profileData: Record<string, unknown> = {
        userId: user.id,
        ...profileAttributes
      };
      await UserProfile.create(profileData as any);
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
      {
        model: UserProfile,
        as: "profile",
        include: [
          { association: "gender", attributes: ["id", "dispName"], required: false },
          { association: "maritalStatus", attributes: ["id", "dispName"], required: false },
          { association: "wardNumber", attributes: ["id", "dispName"], required: false },
          { association: "boothNumber", attributes: ["id", "dispName"], required: false },
          { association: "educationalDetail", attributes: ["id", "dispName"], required: false },
          {
            association: "educationalDetailGroup",
            attributes: ["id", "dispName"],
            required: false
          },
          { association: "sector", attributes: ["id", "dispName"], required: false }
        ]
      },
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
      },
      { association: "roles", include: [{ association: "permissions" }] }
    ]
  });

  // Enrich Admin roles with all permissions
  if (created && created.roles && created.roles.length > 0) {
    const enrichedRoles = await enrichAdminRolePermissions(created.roles);
    const enrichedUser = {
      ...created.toJSON(),
      roles: enrichedRoles.reverse()
    };
    return sendCreated(res, enrichedUser, "User created successfully");
  }

  return sendCreated(res, created, "User created successfully");
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const includeAuditFields = shouldIncludeAuditFields(req.query);

  const user = await User.findByPk(req.params.id, {
    attributes: buildQueryAttributes({ includeAuditFields }),
    include: [
      {
        model: UserProfile,
        as: "profile",
        include: [
          { association: "gender", attributes: ["id", "dispName"], required: false },
          { association: "maritalStatus", attributes: ["id", "dispName"], required: false },
          { association: "wardNumber", attributes: ["id", "dispName"], required: false },
          { association: "boothNumber", attributes: ["id", "dispName"], required: false },
          { association: "educationalDetail", attributes: ["id", "dispName"], required: false },
          {
            association: "educationalDetailGroup",
            attributes: ["id", "dispName"],
            required: false
          },
          { association: "sector", attributes: ["id", "dispName"], required: false }
        ]
      },
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
      },
      { association: "roles", include: [{ association: "permissions" }] }
    ]
  });

  if (!user) {
    return sendNotFound(res, "User not found", "user");
  }

  // Enrich Admin roles with all permissions
  if (user.roles && user.roles.length > 0) {
    const enrichedRoles = await enrichAdminRolePermissions(user.roles);
    const enrichedUser = {
      ...user.toJSON(),
      roles: enrichedRoles.reverse()
    };
    return sendSuccess(res, enrichedUser, "User retrieved successfully");
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
        // When creating a new profile, wardNumberId and boothNumberId are required
        if (!profileAttributes.wardNumberId) {
          throw new ApiError("profile.wardNumberId is required when creating profile", 400);
        }
        if (!profileAttributes.boothNumberId) {
          throw new ApiError("profile.boothNumberId is required when creating profile", 400);
        }
        await UserProfile.create({
          userId: user.id,
          wardNumberId: profileAttributes.wardNumberId,
          boothNumberId: profileAttributes.boothNumberId,
          ...profileAttributes
        });
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
      {
        model: UserProfile,
        as: "profile",
        include: [
          { association: "gender", attributes: ["id", "dispName"], required: false },
          { association: "maritalStatus", attributes: ["id", "dispName"], required: false },
          { association: "wardNumber", attributes: ["id", "dispName"], required: false },
          { association: "boothNumber", attributes: ["id", "dispName"], required: false },
          { association: "educationalDetail", attributes: ["id", "dispName"], required: false },
          {
            association: "educationalDetailGroup",
            attributes: ["id", "dispName"],
            required: false
          },
          { association: "sector", attributes: ["id", "dispName"], required: false }
        ]
      },
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
      },
      { association: "roles", include: [{ association: "permissions" }] }
    ]
  });

  // Enrich Admin roles with all permissions
  if (updated && updated.roles && updated.roles.length > 0) {
    const enrichedRoles = await enrichAdminRolePermissions(updated.roles);
    const enrichedUser = {
      ...updated.toJSON(),
      roles: enrichedRoles.reverse()
    };
    return sendSuccess(res, enrichedUser, "User updated successfully");
  }

  return sendSuccess(res, updated, "User updated successfully");
});

export const updateUserApprovalStatus = asyncHandler(async (req: Request, res: Response) => {
  const payload = req.body;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ApiError("Request body must be an object", 400);
  }

  const payloadKeys = Object.keys(payload as Record<string, unknown>);
  if (!payloadKeys.includes("status")) {
    throw new ApiError("status is required", 400);
  }

  if (payloadKeys.some((key) => key !== "status")) {
    throw new ApiError("Only status can be updated using this endpoint", 400);
  }

  const parsedStatus = Number((payload as any).status);
  if (!Number.isInteger(parsedStatus) || ![0, 1, 2].includes(parsedStatus)) {
    throw new ApiError("status must be 0, 1, or 2", 400);
  }

  const user = await User.findByPk(req.params.id);

  if (!user) {
    throw new ApiError("User not found", 404);
  }

  const fetchUserDetails = () =>
    User.findByPk(user.id, {
      include: [
        {
          model: UserProfile,
          as: "profile",
          include: [
            { association: "gender", attributes: ["id", "dispName"], required: false },
            { association: "maritalStatus", attributes: ["id", "dispName"], required: false },
            { association: "wardNumber", attributes: ["id", "dispName"], required: false },
            { association: "boothNumber", attributes: ["id", "dispName"], required: false },
            { association: "educationalDetail", attributes: ["id", "dispName"], required: false },
            {
              association: "educationalDetailGroup",
              attributes: ["id", "dispName"],
              required: false
            },
            { association: "sector", attributes: ["id", "dispName"], required: false }
          ]
        },
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

  const unchangedMessage =
    parsedStatus === 1
      ? "User is already approved"
      : parsedStatus === 2
        ? "User is already pending approval"
        : "User is already inactive";

  if (user.status === parsedStatus) {
    const hydrated = await fetchUserDetails();
    if (hydrated && hydrated.roles && hydrated.roles.length > 0) {
      const enrichedRoles = await enrichAdminRolePermissions(hydrated.roles);
      const enrichedUser = {
        ...hydrated.toJSON(),
        roles: enrichedRoles.reverse()
      };
      return sendSuccess(res, enrichedUser, unchangedMessage);
    }

    return sendSuccess(res, hydrated, unchangedMessage);
  }

  const actorId = (req as AuthenticatedRequest).user?.id ?? null;
  await user.update({ status: parsedStatus, updatedBy: actorId });
  emitEvent(AppEvent.USER_UPDATED, { userId: user.id, actorId: actorId ?? user.id });

  const updated = await fetchUserDetails();

  const message =
    parsedStatus === 1
      ? "User approved successfully"
      : parsedStatus === 2
        ? "User marked as pending approval"
        : "User deactivated successfully";

  if (updated && updated.roles && updated.roles.length > 0) {
    const enrichedRoles = await enrichAdminRolePermissions(updated.roles);
    const enrichedUser = {
      ...updated.toJSON(),
      roles: enrichedRoles.reverse()
    };
    return sendSuccess(res, enrichedUser, message);
  }

  return sendSuccess(res, updated, message);
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
        {
          model: UserProfile,
          as: "profile",
          include: [
            { association: "gender", attributes: ["id", "dispName"], required: false },
            { association: "maritalStatus", attributes: ["id", "dispName"], required: false },
            { association: "wardNumber", attributes: ["id", "dispName"], required: false },
            { association: "boothNumber", attributes: ["id", "dispName"], required: false },
            { association: "educationalDetail", attributes: ["id", "dispName"], required: false },
            {
              association: "educationalDetailGroup",
              attributes: ["id", "dispName"],
              required: false
            },
            { association: "sector", attributes: ["id", "dispName"], required: false }
          ]
        },
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

    // Enrich Admin roles with all permissions
    if (hydrated && hydrated.roles && hydrated.roles.length > 0) {
      const enrichedRoles = await enrichAdminRolePermissions(hydrated.roles);
      const enrichedUser = {
        ...hydrated.toJSON(),
        roles: enrichedRoles.reverse()
      };
      return sendSuccess(res, enrichedUser, message);
    }

    return sendSuccess(res, hydrated, message);
  }

  const actorId = (req as AuthenticatedRequest).user?.id ?? null;
  await user.update({ status: targetStatus, updatedBy: actorId });
  emitEvent(AppEvent.USER_UPDATED, { userId: user.id, actorId: actorId ?? user.id });

  const updated = await User.findByPk(user.id, {
    include: [
      {
        model: UserProfile,
        as: "profile",
        include: [
          { association: "gender", attributes: ["id", "dispName"], required: false },
          { association: "maritalStatus", attributes: ["id", "dispName"], required: false },
          { association: "wardNumber", attributes: ["id", "dispName"], required: false },
          { association: "boothNumber", attributes: ["id", "dispName"], required: false },
          { association: "educationalDetail", attributes: ["id", "dispName"], required: false },
          {
            association: "educationalDetailGroup",
            attributes: ["id", "dispName"],
            required: false
          },
          { association: "sector", attributes: ["id", "dispName"], required: false }
        ]
      },
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

  // Enrich Admin roles with all permissions
  if (updated && updated.roles && updated.roles.length > 0) {
    const enrichedRoles = await enrichAdminRolePermissions(updated.roles);
    const enrichedUser = {
      ...updated.toJSON(),
      roles: enrichedRoles.reverse()
    };
    return sendSuccess(res, enrichedUser, message);
  }

  return sendSuccess(res, updated, message);
});

export const updateUserPostsBlockStatus = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findByPk(req.params.id, {
    include: [{ model: UserProfile, as: "profile" }]
  });

  if (!user) {
    throw new ApiError("User not found", 404);
  }

  const action = typeof req.body?.action === "string" ? req.body.action.toLowerCase() : "";
  if (action !== "block" && action !== "unblock") {
    throw new ApiError("Invalid action. Allowed values are 'block' or 'unblock'.", 400);
  }

  const shouldBlock = action === "block";
  const actorId = (req as AuthenticatedRequest).user?.id ?? null;

  const fetchUserDetails = () =>
    User.findByPk(user.id, {
      include: [
        {
          model: UserProfile,
          as: "profile",
          include: [
            { association: "gender", attributes: ["id", "dispName"], required: false },
            { association: "maritalStatus", attributes: ["id", "dispName"], required: false },
            { association: "wardNumber", attributes: ["id", "dispName"], required: false },
            { association: "boothNumber", attributes: ["id", "dispName"], required: false },
            { association: "educationalDetail", attributes: ["id", "dispName"], required: false },
            {
              association: "educationalDetailGroup",
              attributes: ["id", "dispName"],
              required: false
            },
            { association: "sector", attributes: ["id", "dispName"], required: false }
          ]
        },
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

  if (!user.profile) {
    if (!shouldBlock) {
      const hydrated = await fetchUserDetails();
      return sendSuccess(res, hydrated, "User posts are already unblocked");
    }

    // When creating profile for post blocking, ward and booth numbers are still required
    // You may want to get these from request body or user data
    const { wardNumberId, boothNumberId } = req.body;
    if (!wardNumberId || !boothNumberId) {
      throw new ApiError("wardNumberId and boothNumberId are required to create user profile", 400);
    }

    await UserProfile.create({
      userId: user.id,
      wardNumberId,
      boothNumberId,
      postsBlocked: true,
      createdBy: actorId,
      updatedBy: actorId
    });
  } else {
    if (user.profile.postsBlocked === shouldBlock) {
      const hydrated = await fetchUserDetails();
      const message = shouldBlock
        ? "User posts are already blocked"
        : "User posts are already unblocked";
      return sendSuccess(res, hydrated, message);
    }

    await user.profile.update({
      postsBlocked: shouldBlock,
      updatedBy: actorId
    });
  }

  const updated = await fetchUserDetails();
  const message = shouldBlock
    ? "User posts blocked successfully"
    : "User posts unblocked successfully";

  // Reverse roles array
  if (updated && updated.roles && updated.roles.length > 0) {
    const enrichedRoles = await enrichAdminRolePermissions(updated.roles);
    const enrichedUser = {
      ...updated.toJSON(),
      roles: enrichedRoles.reverse()
    };
    return sendSuccess(res, enrichedUser, message);
  }

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
