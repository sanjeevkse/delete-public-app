import type { IncludeOptions } from "sequelize";
import FormEventAccessibility from "../models/FormEventAccessibility";
import MetaWardNumber from "../models/MetaWardNumber";
import MetaBoothNumber from "../models/MetaBoothNumber";
import MetaUserRole from "../models/MetaUserRole";
import UserProfile from "../models/UserProfile";
import UserRole from "../models/UserRole";
import { ApiError } from "../middlewares/errorHandler";

/**
 * Accessibility payload for FormEvent
 * Defines which geographic area + role combination can access a form event
 */
export interface AccessibilityPayload {
  wardNumberId: number;
  boothNumberId: number;
  userRoleId: number;
}

/**
 * Build Sequelize include options for FormEvent accessibility with all related data
 */
export const buildAccessibilityInclude = (): IncludeOptions => ({
  model: FormEventAccessibility,
  as: "accessibility",
  include: [
    {
      model: MetaWardNumber,
      as: "wardNumber",
      attributes: ["id", "dispName", "status"]
    },
    {
      model: MetaBoothNumber,
      as: "boothNumber",
      attributes: ["id", "dispName", "status"]
    },
    {
      model: MetaUserRole,
      as: "userRole",
      attributes: ["id", "dispName", "status"]
    }
  ]
});

/**
 * Validate accessibility payload array
 * Ensures all required fields are present and valid numbers
 */
export const validateAccessibilityPayload = (payload: unknown): AccessibilityPayload[] => {
  if (!Array.isArray(payload)) {
    throw new ApiError("Accessibility must be an array", 400);
  }

  if (payload.length === 0) {
    throw new ApiError("At least one accessibility entry is required", 400);
  }

  return payload.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new ApiError(`Accessibility entry at index ${index} is invalid`, 400);
    }

    const { wardNumberId, boothNumberId, userRoleId } = item as Record<string, unknown>;

    const parseNumber = (value: unknown, fieldName: string): number => {
      const num = Number(value);
      if (!Number.isInteger(num) || num <= 0) {
        throw new ApiError(`accessibility[${index}].${fieldName} must be a positive integer`, 400);
      }
      return num;
    };

    return {
      wardNumberId: parseNumber(wardNumberId, "wardNumberId"),
      boothNumberId: parseNumber(boothNumberId, "boothNumberId"),
      userRoleId: parseNumber(userRoleId, "userRoleId")
    };
  });
};

/**
 * Verify that all referenced IDs (ward, booth, role) exist in the database
 * Validates referential integrity before creating/updating accessibility rules
 */
export const ensureAccessibilityReferencesExist = async (
  records: AccessibilityPayload[]
): Promise<void> => {
  const wardIds = Array.from(new Set(records.map((item) => item.wardNumberId)));
  const boothIds = Array.from(new Set(records.map((item) => item.boothNumberId)));
  const roleIds = Array.from(new Set(records.map((item) => item.userRoleId)));

  const { Op } = require("sequelize");

  const ensureIdsExist = async (ids: number[], model: any, fieldName: string) => {
    if (!ids.length) {
      return;
    }

    const countResult = await model.count({
      where: {
        id: { [Op.in]: ids }
      }
    });

    const matched =
      typeof countResult === "number" ? countResult : (countResult as unknown[]).length;

    if (matched !== ids.length) {
      throw new ApiError(`One or more ${fieldName} values are invalid`, 400);
    }
  };

  await Promise.all([
    ensureIdsExist(wardIds, MetaWardNumber, "wardNumberId"),
    ensureIdsExist(boothIds, MetaBoothNumber, "boothNumberId"),
    ensureIdsExist(roleIds, MetaUserRole, "userRoleId")
  ]);
};

/**
 * User's access profile - geographic location and role
 */
export interface UserAccessProfile {
  wardNumberId: number | null;
  boothNumberId: number | null;
  roleIds: number[];
}

/**
 * Get user's access profile from UserProfile and roles
 * Returns ward, booth, and all role IDs assigned to the user
 */
export const getUserAccessProfile = async (userId: number): Promise<UserAccessProfile> => {
  const profile = await UserProfile.findOne({
    where: { userId },
    attributes: ["wardNumberId", "boothNumberId"]
  });

  const roles = await UserRole.findAll({
    where: { userId, status: 1 },
    attributes: ["roleId"]
  });

  return {
    wardNumberId: profile?.wardNumberId ?? null,
    boothNumberId: profile?.boothNumberId ?? null,
    roleIds: roles.map((r) => r.roleId)
  };
};

/**
 * Check if a user can access a specific form event
 * Returns true if user's ward+booth+role matches any accessibility rule for the event
 */
export const canUserAccessFormEvent = async (
  userId: number,
  formEventId: number
): Promise<boolean> => {
  const userAccess = await getUserAccessProfile(userId);

  // User must have ward and booth assigned
  if (!userAccess.wardNumberId || !userAccess.boothNumberId) {
    return false;
  }

  // User must have at least one role
  if (userAccess.roleIds.length === 0) {
    return false;
  }

  const { Op } = require("sequelize");

  // Check if form event has accessibility rule matching user's geography and role
  const accessibility = await FormEventAccessibility.findOne({
    where: {
      formEventId,
      wardNumberId: userAccess.wardNumberId,
      boothNumberId: userAccess.boothNumberId,
      userRoleId: { [Op.in]: userAccess.roleIds },
      status: 1
    }
  });

  return !!accessibility;
};

/**
 * Build WHERE clause for filtering FormEventAccessibility by user's access
 * Used in queries to filter form events at database level
 */
export const buildAccessibilityWhereClause = (
  wardNumberId: number | null,
  boothNumberId: number | null,
  roleIds: number[]
): Record<string, unknown> => {
  const { Op } = require("sequelize");

  return {
    wardNumberId,
    boothNumberId,
    userRoleId: { [Op.in]: roleIds },
    status: 1
  };
};
