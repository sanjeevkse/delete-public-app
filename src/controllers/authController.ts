import type { Request, Response } from "express";
import { Op } from "sequelize";

import env from "../config/env";
import { PUBLIC_ROLE_NAME } from "../config/rbac";
import { AppEvent, emitEvent } from "../events/eventBus";
import { ApiError } from "../middlewares/errorHandler";
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

  const user = await findUserByContactNumber(contactNumber);

  const now = new Date();
  const existingOtp = await UserOtp.findOne({
    where: {
      contactNumber,
      purpose: UserOtpPurpose.LOGIN,
      status: 1,
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
    userExists: Boolean(user),
    attemptsLeft: attemptsAllowance
  });
});

export const register = asyncHandler(async (req: Request, res: Response) => {
  const {
    contactNumber,
    fullName,
    email,
    otp,
    instagramId,
    alternateMobileNumber,
    address,
    wardName
  } = req.body as {
    contactNumber?: string;
    fullName?: string;
    email?: string;
    otp?: string;
    instagramId?: string;
    alternateMobileNumber?: string;
    address?: string;
    wardName?: string;
  };

  if (!contactNumber) {
    throw new ApiError("contactNumber is required", 400);
  }

  if (!otp) {
    throw new ApiError("otp is required", 400);
  }

  const existingByContact = await User.findOne({ where: { contactNumber } });
  if (existingByContact) {
    throw new ApiError("contactNumber already registered", 409);
  }

  if (email) {
    const existingByEmail = await User.findOne({ where: { email } });
    if (existingByEmail) {
      throw new ApiError("email already registered", 409);
    }
  }

  await verifyOtpForContactNumber(contactNumber, otp);

  const user = await User.create({
    contactNumber,
    email: email ?? null,
    fullName: fullName ?? null,
    status: 1
  });

  await ensureDefaultRole(user.id);

  const profilePayload: Record<string, unknown> = {};
  if (fullName) {
    profilePayload.displayName = fullName;
  }
  if (alternateMobileNumber) {
    profilePayload.alternateMobileNumber = alternateMobileNumber;
  }
  if (address) {
    profilePayload.address = address;
  }
  if (wardName) {
    profilePayload.wardName = wardName;
  }
  if (instagramId) {
    profilePayload.instagramId = instagramId;
  }

  if (Object.keys(profilePayload).length > 0) {
    await upsertUserProfile(user.id, profilePayload);
  }

  emitEvent(AppEvent.USER_CREATED, { userId: user.id });

  const accessProfile = await getUserAccessProfile(user.id);

  const createdUser = await User.findByPk(user.id, {
    include: [
      { association: "profile" },
      { association: "roles", include: [{ association: "permissions" }] }
    ]
  });

  const token = generateAccessToken({
    userId: user.id,
    roles: accessProfile.roles,
    permissions: ["*"] // accessProfile.permissions
  });

  res.status(201).json({
    token,
    user: createdUser,
    access: accessProfile
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

  const user = await findUserByContactNumber(contactNumber);

  if (!user) {
    throw new ApiError("User not found", 404);
  }

  if (user.status !== 1) {
    throw new ApiError("Account is inactive", 403);
  }

  await verifyOtpForContactNumber(user.contactNumber, otp);

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

  res.json({
    token,
    user: sanitizedUser,
    access: accessProfile
  });
});
