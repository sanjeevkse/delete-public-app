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
import User from "../models/User";
import UserOtp from "../models/UserOtp";
import UserProfile from "../models/UserProfile";
import { getRoleByName, getUserAccessProfile, setUserRoles } from "../services/rbacService";
import { buildProfileAttributes } from "../services/userProfileService";
import asyncHandler from "../utils/asyncHandler";
import { generateAccessToken, generateNumericOtp } from "../utils/auth";
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
  const { contactNumber } = req.body as { contactNumber?: string };

  if (!contactNumber) {
    throw new ApiError("contactNumber is required", 400);
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

  res.json({
    message: "OTP generated successfully",
    otp,
    attemptsLeft: attemptsAllowance
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { contactNumber, otp } = req.body as {
    contactNumber?: string;
    otp?: string;
  };

  if (!contactNumber) {
    throw new ApiError("contactNumber is required", 400);
  }

  if (!otp) {
    throw new ApiError("otp is required", 400);
  }

  await verifyOtpForContactNumber(contactNumber, otp);

  let user = await findUserByContactNumber(contactNumber);
  const userExists = Boolean(user);

  if (!user) {
    user = await User.create({
      contactNumber,
      status: 1
    });
    await user.update({
      createdBy: user.id,
      updatedBy: user.id
    });
    await ensureDefaultRole(user.id);
    emitEvent(AppEvent.USER_CREATED, { userId: user.id });
  } else if (user.status !== 1) {
    throw new ApiError("Account is inactive", 403);
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
      { association: "profile" },
      { association: "roles", include: [{ association: "permissions" }] }
    ]
  });

  const profileExists = Boolean(sanitizedUser?.profile);
  const resolvedUserExists = userExists && profileExists;

  res.json({
    userExists: resolvedUserExists,
    token,
    user: sanitizedUser,
    access: accessProfile
  });
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
      { association: "profile" },
      { association: "roles", include: [{ association: "permissions" }] }
    ]
  });

  res.json({
    user: updatedUser
  });
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
      { association: "profile" },
      { association: "roles", include: [{ association: "permissions" }] }
    ]
  });

  if (!updatedUser) {
    throw new ApiError("User not found", 404);
  }

  res.json({
    user: updatedUser
  });
});

export const getSidebar = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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
          permissions?: Array<{ dispName: string }>;
        };
        if (Array.isArray(payload.permissions)) {
          payload.permissions = [...payload.permissions].sort((a, b) =>
            a.dispName.localeCompare(b.dispName)
          );
        }
        return payload;
      })
    : groups
        .map((group) => {
          const payload = group.toJSON() as {
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

          payload.permissions = [...visiblePermissions].sort((a, b) =>
            a.dispName.localeCompare(b.dispName)
          );
          return payload;
        })
        .filter((groupPayload): groupPayload is Record<string, unknown> => Boolean(groupPayload));

  res.json({
    groups: serializedGroups
  });
});
