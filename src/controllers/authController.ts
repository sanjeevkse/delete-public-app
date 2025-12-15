import type { Request, Response, Express } from "express";
import { Op } from "sequelize";

import env from "../config/env";
import { PUBLIC_ROLE_NAME } from "../config/rbac";
import { AppEvent, emitEvent } from "../events/eventBus";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { requireAuthenticatedUser } from "../middlewares/authMiddleware";
import { ApiError } from "../middlewares/errorHandler";
import { buildPublicUploadPath } from "../middlewares/uploadMiddleware";
import MetaPermissionGroup from "../models/MetaPermissionGroup";
import Sidebar from "../models/Sidebar";
import User from "../models/User";
import UserOtp from "../models/UserOtp";
import UserProfile from "../models/UserProfile";
import RoleSidebar from "../models/RoleSidebar";
import PermissionGroupSidebar from "../models/PermissionGroupSidebar";
import {
  getRoleByName,
  getUserAccessProfile,
  setUserRoles,
  enrichAdminRolePermissions,
  filterUserRolePermissions
} from "../services/rbacService";
import { buildProfileAttributes } from "../services/userProfileService";
import asyncHandler from "../utils/asyncHandler";
import { generateAccessToken, generateNumericOtp } from "../utils/auth";
import { sendSuccess } from "../utils/apiResponse";
import { normalizePhoneNumber } from "../utils/phoneNumber";
import { UserOtpPurpose } from "../types/enums";

const MASTER_OTP = env.auth.masterOtp;
const OTP_EXPIRY_MINUTES = env.auth.otpExpiryMinutes;

const findUserByContactNumber = async (contactNumber: string): Promise<User | null> => {
  return User.findOne({ where: { contactNumber } });
};

const ensureDefaultRole = async (userId: number): Promise<void> => {
  const publicRole = await getRoleByName(PUBLIC_ROLE_NAME);
  if (!publicRole) {
    throw new ApiError("Default public role is not configured", 500);
  }

  await setUserRoles(userId, [publicRole.id]);
};

const upsertUserProfile = async (userId: number, profileInput?: Record<string, unknown> | null) => {
  if (!profileInput) {
    return;
  }

  const existingProfile = await UserProfile.findOne({ where: { userId } });
  const profileAttributes = buildProfileAttributes(profileInput, existingProfile ?? undefined);

  if (Object.keys(profileAttributes).length === 0) {
    return;
  }

  if (existingProfile) {
    await existingProfile.update(profileAttributes);
  } else {
    await UserProfile.create({ userId, ...profileAttributes });
  }
};

const verifyOtpForContactNumber = async (
  contactNumber: string,
  otp?: string | null
): Promise<void> => {
  if (!otp) {
    return;
  }

  const now = new Date();

  if (otp === MASTER_OTP) {
    await UserOtp.update(
      { status: 0, consumedAt: now },
      {
        where: {
          contactNumber,
          purpose: UserOtpPurpose.LOGIN,
          status: 1
        }
      }
    );
    return;
  }

  const otpRecord = await UserOtp.findOne({
    where: {
      contactNumber,
      purpose: UserOtpPurpose.LOGIN,
      status: 1,
      consumedAt: null,
      expiresAt: { [Op.gt]: now }
    },
    order: [["createdAt", "DESC"]]
  });

  if (!otpRecord) {
    throw new ApiError("OTP expired or not found", 401);
  }

  if (otpRecord.otpPlain !== otp) {
    const attemptsLeft = Math.max((otpRecord.attemptsLeft ?? 0) - 1, 0);
    await otpRecord.update({
      attemptsLeft,
      status: attemptsLeft <= 0 ? 0 : otpRecord.status
    });
    throw new ApiError("Invalid OTP", 401);
  }

  await otpRecord.update({
    consumedAt: now,
    attemptsLeft: 0,
    status: 0
  });
};

export const requestOtp = asyncHandler(async (req: Request, res: Response) => {
  const payload = req.body as { contactNumber?: unknown };
  const contactNumber = normalizePhoneNumber(payload.contactNumber);

  // Check if user exists and is pending approval
  const existingUser = await findUserByContactNumber(contactNumber);
  if (existingUser) {
    const userProfile = await UserProfile.findOne({ where: { userId: existingUser.id } });
    const profileExists = Boolean(userProfile);
    const resolvedUserExists = profileExists;

    if (existingUser.status === 2 && resolvedUserExists) {
      throw new ApiError("Account requires admin approval", 403);
    }
  }

  const now = new Date();
  const existingOtp = await UserOtp.findOne({
    where: {
      contactNumber,
      purpose: UserOtpPurpose.LOGIN,
      consumedAt: null,
      expiresAt: { [Op.gt]: now }
    },
    order: [["createdAt", "DESC"]]
  });

  let attemptsAllowance = 3;

  if (existingOtp) {
    const nextAllowance = Math.max((existingOtp.attemptsLeft ?? 0) - 1, 0);

    if (nextAllowance <= 0) {
      await existingOtp.update({ status: 0, attemptsLeft: 0 });
      throw new ApiError("OTP resend limit reached", 429);
    }

    attemptsAllowance = nextAllowance;
    await existingOtp.update({ status: 0, attemptsLeft: nextAllowance });
  }

  await UserOtp.update(
    { status: 0 },
    { where: { contactNumber, purpose: UserOtpPurpose.LOGIN, status: 1 } }
  );

  const otp = generateNumericOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await UserOtp.create({
    contactNumber,
    purpose: UserOtpPurpose.LOGIN,
    otpPlain: otp,
    expiresAt,
    attemptsLeft: attemptsAllowance
  });

  return sendSuccess(
    res,
    {
      otp,
      attemptsLeft: attemptsAllowance
    },
    "OTP generated successfully"
  );
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const payload = req.body as {
    contactNumber?: unknown;
    otp?: unknown;
  };

  const contactNumber = normalizePhoneNumber(payload.contactNumber);

  if (typeof payload.otp !== "string" || payload.otp.trim() === "") {
    throw new ApiError("otp is required", 400);
  }

  const otp = payload.otp.trim();

  await verifyOtpForContactNumber(contactNumber, otp);

  let user = await findUserByContactNumber(contactNumber);
  const userExists = Boolean(user);

  if (!user) {
    user = await User.create({
      contactNumber,
      status: 2
    });
    await user.update({
      createdBy: user.id,
      updatedBy: user.id
    });
    await ensureDefaultRole(user.id);
    emitEvent(AppEvent.USER_CREATED, { userId: user.id });
  }

  if (!user) {
    throw new ApiError("Unable to resolve user", 500);
  }

  emitEvent(AppEvent.USER_LOGGED_IN, { userId: user.id });

  const accessProfile = await getUserAccessProfile(user.id);

  const token = generateAccessToken({
    userId: user.id,
    roles: accessProfile.roles,
    permissions: ["*"] //accessProfile.permissions
  });

  const sanitizedUser = await User.findByPk(user.id, {
    include: [
      {
        association: "profile",
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
      { association: "roles", include: [{ association: "permissions" }] }
    ]
  });

  const profileExists = Boolean(sanitizedUser?.profile);
  const resolvedUserExists = userExists && profileExists;

  // if (user.status !== 1) {
  //   throw new ApiError("Account is inactive", 403);
  // }

  // Enrich Admin roles with all permissions, then filter based on user restrictions
  let userForResponse = sanitizedUser;
  if (sanitizedUser && sanitizedUser.roles && sanitizedUser.roles.length > 0) {
    const enrichedRoles = await enrichAdminRolePermissions(sanitizedUser.roles);
    const filteredRoles = await filterUserRolePermissions(user.id, enrichedRoles);
    userForResponse = {
      ...sanitizedUser.toJSON(),
      roles: filteredRoles
    } as any;
  }

  return sendSuccess(
    res,
    {
      userExists: resolvedUserExists,
      token,
      user: userForResponse,
      access: accessProfile
    },
    "Login successful"
  );
});

export const getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);

  const user = await User.findByPk(userId, {
    include: [
      {
        association: "profile",
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
      { association: "roles", include: [{ association: "permissions" }] }
    ]
  });

  if (!user) {
    throw new ApiError("User not found", 404);
  }

  // Get user access profile with blocked user permissions filtered
  const accessProfile = await getUserAccessProfile(userId);

  const userExists = Boolean(user) && Boolean(user.profile);

  // Enrich Admin roles with all permissions, then filter based on user restrictions
  let userForResponse = user;
  if (user.roles && user.roles.length > 0) {
    const enrichedRoles = await enrichAdminRolePermissions(user.roles);
    const filteredRoles = await filterUserRolePermissions(userId, enrichedRoles);
    userForResponse = {
      ...user.toJSON(),
      roles: filteredRoles
    } as any;
  }

  return sendSuccess(
    res,
    { userExists, user: userForResponse, access: accessProfile },
    "Profile retrieved successfully"
  );
});

export const updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);

  const payload = req.body as Record<string, unknown>;
  if (!payload || typeof payload !== "object") {
    throw new ApiError("Request body must be an object", 400);
  }

  const user = await User.findByPk(userId, {
    include: [{ association: "profile" }]
  });

  if (!user) {
    throw new ApiError("User not found", 404);
  }

  const userUpdates: Record<string, unknown> = {};
  let normalizedFullName: string | null | undefined;

  if ("email" in payload) {
    const emailValue = payload.email;
    let normalizedEmail: string | null;

    if (
      emailValue === null ||
      emailValue === undefined ||
      (typeof emailValue === "string" && emailValue.trim() === "")
    ) {
      normalizedEmail = null;
    } else if (typeof emailValue === "string") {
      normalizedEmail = emailValue.trim();
    } else {
      throw new ApiError("email must be a string", 400);
    }

    if (normalizedEmail) {
      const existingByEmail = await User.findOne({
        where: { email: normalizedEmail },
        attributes: ["id"]
      });
      if (existingByEmail && existingByEmail.id !== userId) {
        throw new ApiError("email already registered", 409);
      }
    }

    userUpdates.email = normalizedEmail;
  }

  if ("fullName" in payload) {
    const fullNameValue = payload.fullName;

    if (
      fullNameValue === null ||
      fullNameValue === undefined ||
      (typeof fullNameValue === "string" && fullNameValue.trim() === "")
    ) {
      normalizedFullName = null;
    } else if (typeof fullNameValue === "string") {
      normalizedFullName = fullNameValue.trim();
    } else {
      throw new ApiError("fullName must be a string", 400);
    }

    userUpdates.fullName = normalizedFullName;
  }

  userUpdates.updatedBy = userId;

  if (Object.keys(userUpdates).length > 0) {
    await user.update(userUpdates);
  }

  const profileInput: Record<string, unknown> = {};
  const nestedProfile = payload.profile;

  if (nestedProfile && typeof nestedProfile === "object") {
    Object.assign(profileInput, nestedProfile as Record<string, unknown>);
  }

  const userFieldKeys = new Set([
    "contactNumber",
    "email",
    "fullName",
    "status",
    "createdBy",
    "updatedBy",
    "id"
  ]);
  const ignoredKeys = new Set([
    "profile",
    "roles",
    "roleIds",
    "permissions",
    "access",
    "token",
    "userExists",
    "otp",
    "profileImageUrl"
  ]);
  Object.entries(payload).forEach(([key, value]) => {
    if (!userFieldKeys.has(key) && !ignoredKeys.has(key)) {
      profileInput[key] = value;
    }
  });

  if (normalizedFullName !== undefined && profileInput["displayName"] === undefined) {
    profileInput["displayName"] = normalizedFullName;
  }

  if ("wardName" in profileInput) {
    delete profileInput["wardName"];
  }
  if ("profileImageUrl" in profileInput) {
    delete profileInput["profileImageUrl"];
  }

  if (Object.keys(profileInput).length > 0) {
    await upsertUserProfile(user.id, profileInput);
  }

  await UserProfile.findOrCreate({
    where: { userId: user.id },
    defaults: { userId: user.id }
  });

  const updatedUser = await User.findByPk(user.id, {
    include: [
      {
        association: "profile",
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
      { association: "roles", include: [{ association: "permissions" }] }
    ]
  });

  // Enrich Admin roles with all permissions
  let userForResponse = updatedUser;
  if (updatedUser && updatedUser.roles && updatedUser.roles.length > 0) {
    const enrichedRoles = await enrichAdminRolePermissions(updatedUser.roles);
    userForResponse = {
      ...updatedUser.toJSON(),
      roles: enrichedRoles
    } as any;
  }

  return sendSuccess(res, { user: userForResponse }, "Profile updated successfully");
});

export const updateProfileImage = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);

  const uploadedFiles = Array.isArray(req.files) ? (req.files as Express.Multer.File[]) : undefined;
  const uploadedFile =
    uploadedFiles && uploadedFiles.length > 0
      ? uploadedFiles[0]
      : req.file
        ? (req.file as Express.Multer.File)
        : undefined;

  if (!uploadedFile) {
    throw new ApiError("profileImage file is required", 400);
  }

  const profileImageUrl = buildPublicUploadPath(uploadedFile.path);

  const [profile] = await UserProfile.findOrCreate({
    where: { userId },
    defaults: { userId }
  });

  await profile.update({
    profileImageUrl,
    updatedBy: userId
  });

  const updatedUser = await User.findByPk(userId, {
    include: [
      {
        association: "profile",
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
      { association: "roles", include: [{ association: "permissions" }] }
    ]
  });

  if (!updatedUser) {
    throw new ApiError("User not found", 404);
  }

  // Enrich Admin roles with all permissions
  let userForResponse = updatedUser;
  if (updatedUser.roles && updatedUser.roles.length > 0) {
    const enrichedRoles = await enrichAdminRolePermissions(updatedUser.roles);
    userForResponse = {
      ...updatedUser.toJSON(),
      roles: enrichedRoles
    } as any;
  }

  return sendSuccess(res, { user: userForResponse }, "Profile image updated successfully");
});

export const getSidebar = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);

  const accessProfile = await getUserAccessProfile(userId);
  const userRoleIds = accessProfile.roles.map((roleName) => roleName);
  const permissionSet = new Set(accessProfile.permissions ?? []);

  // Fetch sidebars based on role-based access (from tbl_xref_role_sidebar)
  const roleSidebars = await RoleSidebar.findAll({
    where: {
      roleId: userRoleIds.length > 0 ? { [Op.in]: userRoleIds } : null,
      status: 1
    },
    attributes: ["sidebarId"],
    raw: true
  });

  // Fetch sidebars based on permission group access (from tbl_xref_permission_group_sidebar)
  const pgSidebars = await PermissionGroupSidebar.findAll({
    where: {
      permissionGroupId: userRoleIds.length > 0 ? { [Op.in]: userRoleIds } : null,
      status: 1
    },
    attributes: ["sidebarId"],
    raw: true
  });

  const roleBasedSidebarIds = new Set(roleSidebars.map((rs) => rs.sidebarId));
  const pgBasedSidebarIds = new Set(pgSidebars.map((ps) => ps.sidebarId));

  // Combine all sidebar IDs from junction tables
  const restrictedSidebarIds = new Set([...roleBasedSidebarIds, ...pgBasedSidebarIds]);

  // Fetch all sidebars
  const allSidebars = await Sidebar.findAll({
    where: { status: 1 },
    attributes: ["id", "dispName", "screenName", "icon", "status"],
    order: [["dispName", "ASC"]]
  });

  // Determine which sidebars to show
  const serializedSidebars = allSidebars
    .filter((sidebar) => {
      // If sidebar is in junction tables (restricted), check access
      if (restrictedSidebarIds.has(sidebar.id)) {
        // User must have matching role or permission group
        return roleBasedSidebarIds.has(sidebar.id) || pgBasedSidebarIds.has(sidebar.id);
      }
      // If sidebar is not restricted (public), show to authenticated users
      return true;
    })
    .map((sidebar) => ({
      id: sidebar.id,
      dispName: sidebar.dispName,
      screenName: sidebar.screenName,
      icon: sidebar.icon,
      status: sidebar.status,
      label: sidebar.dispName,
      description: ""
    }));

  // Remove duplicates
  const uniqueSidebars = Array.from(
    new Map(serializedSidebars.map((item) => [item.id, item])).values()
  );

  // Add open sidebars that don't require permissions
  const openSidebars = [
    {
      id: 901,
      dispName: "Requests",
      screenName: "REQUESTS_SCREEN",
      icon: "copy",
      status: 1,
      label: "Requests",
      description: "User requests and submissions"
    },
    {
      id: 902,
      dispName: "Profile",
      screenName: "PROFILE_SCREEN",
      icon: "id-card",
      status: 1,
      label: "Profile",
      description: "User profile and settings"
    }
  ];

  uniqueSidebars.unshift(...openSidebars);

  // Add dashboard for non-public users
  if (accessProfile.roles.some((role) => role !== PUBLIC_ROLE_NAME)) {
    const dashboardSidebar = {
      id: 950,
      dispName: "Dashboard",
      screenName: "DASHBOARD_SCREEN",
      icon: "tachometer-alt",
      status: 1,
      label: "Dashboard",
      description: "Administrative dashboard"
    };
    uniqueSidebars.unshift(dashboardSidebar);
  }

  return sendSuccess(res, { sidebars: uniqueSidebars }, "Sidebar data retrieved successfully");
});

export const getSidebarOld = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);

  const accessProfile = await getUserAccessProfile(userId);
  const permissionSet = new Set(accessProfile.permissions ?? []);

  const groups = await MetaPermissionGroup.findAll({
    include: [{ association: "permissions" }],
    order: [["label", "ASC"]]
  });

  const groupWildcards = new Set(
    Array.from(permissionSet).filter(
      (permission) => typeof permission === "string" && permission.endsWith(":*")
    )
  );

  const serializedGroups = permissionSet.has("*")
    ? groups.map((group) => {
        const payload = group.toJSON() as {
          id: number;
          label: string;
          description?: string;
          sidebar?: string;
          status: number;
          permissions?: Array<{ dispName: string }>;
        };
        // Remove permissions from the response
        delete payload.permissions;
        return payload;
      })
    : groups
        .map((group) => {
          const payload = group.toJSON() as {
            id: number;
            label: string;
            description?: string;
            sidebar?: string;
            status: number;
            action?: string;
            permissions?: Array<{ dispName: string }>;
          };
          const hasGroupWildcard = payload.action ? groupWildcards.has(payload.action) : false;
          const availablePermissions = Array.isArray(payload.permissions)
            ? payload.permissions
            : [];
          const visiblePermissions = hasGroupWildcard
            ? availablePermissions
            : availablePermissions.filter((permission) => permissionSet.has(permission.dispName));

          if (visiblePermissions.length === 0) {
            return null;
          }

          // Remove permissions from the response
          delete payload.permissions;
          return payload;
        })
        .filter((groupPayload) => groupPayload !== null);

  const publicSidebars = [
    {
      id: 901,
      label: "Requets",
      description: "User requests and submissions",
      sidebar: "REQUESTS_SCREEN",
      status: 1,
      icon: "copy"
    },
    {
      id: 902,
      label: "Profile",
      description: "User profile and settings",
      sidebar: "PROFILE_SCREEN",
      status: 1,
      icon: "id-card"
    }
  ];

  serializedGroups.unshift(...publicSidebars);

  const dahboardSidebar = [
    {
      id: 950,
      label: "Dashboard",
      description: "Administrative dashboard",
      sidebar: "DASHBOARD_SCREEN",
      status: 1,
      icon: "tachometer-alt"
    }
  ];

  if (accessProfile.roles.some((role) => role !== PUBLIC_ROLE_NAME)) {
    serializedGroups.unshift(...dahboardSidebar);
  }

  return sendSuccess(res, { groups: serializedGroups }, "Sidebar data retrieved successfully");
});
