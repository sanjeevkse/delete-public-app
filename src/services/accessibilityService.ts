import type { IncludeOptions } from "sequelize";
import { Op } from "sequelize";
import FormEventAccessibility from "../models/FormEventAccessibility";
import MetaWardNumber from "../models/MetaWardNumber";
import MetaBoothNumber from "../models/MetaBoothNumber";
import MetaUserRole from "../models/MetaUserRole";
import UserProfile from "../models/UserProfile";
import UserRole from "../models/UserRole";
import { ApiError } from "../middlewares/errorHandler";
import { isAccessibleToAll } from "./userAccessibilityService";

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

    const parseNumber = (value: unknown, fieldName: string, allowAll: boolean = false): number => {
      const num = Number(value);
      if (!Number.isInteger(num)) {
        throw new ApiError(`accessibility[${index}].${fieldName} must be an integer`, 400);
      }
      // Allow -1 for ward and booth (means 'all'), but only positive for role
      if (allowAll && num === -1) {
        return num;
      }
      if (num <= 0) {
        throw new ApiError(`accessibility[${index}].${fieldName} must be a positive integer`, 400);
      }
      return num;
    };

    return {
      wardNumberId: parseNumber(wardNumberId, "wardNumberId", true), // Allow -1 for "all"
      boothNumberId: parseNumber(boothNumberId, "boothNumberId", true), // Allow -1 for "all"
      userRoleId: parseNumber(userRoleId, "userRoleId", false) // Roles must be positive
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
  // Filter out -1 values (which mean 'all' and don't need to exist in the database)
  const wardIds = Array.from(
    new Set(records.map((item) => item.wardNumberId).filter((id) => id !== -1))
  );
  const boothIds = Array.from(
    new Set(records.map((item) => item.boothNumberId).filter((id) => id !== -1))
  );
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
 * Handles -1 values in accessibility rules for ward/booth (means 'all')
 * Roles do NOT support -1 - must be explicit role IDs
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

  // Get all accessibility rules for this form event
  const accessibilityRules = await FormEventAccessibility.findAll({
    where: {
      formEventId,
      status: 1
    },
    attributes: ["wardNumberId", "boothNumberId", "userRoleId"],
    raw: true
  });

  if (accessibilityRules.length === 0) {
    return false;
  }

  // Check if user's geography and role matches any rule (considering -1 as 'all' for ward/booth only)
  return accessibilityRules.some((rule: any) => {
    // Check ward match (-1 means all wards, otherwise exact match)
    const wardMatches =
      isAccessibleToAll(rule.wardNumberId) || rule.wardNumberId === userAccess.wardNumberId;

    // Check booth match (-1 means all booths, otherwise exact match)
    const boothMatches =
      isAccessibleToAll(rule.boothNumberId) || rule.boothNumberId === userAccess.boothNumberId;

    // Check role match - must be exact match (no -1 for roles)
    const roleMatches = userAccess.roleIds.includes(rule.userRoleId);

    return wardMatches && boothMatches && roleMatches;
  });
};

/**
 * Build WHERE clause for filtering FormEventAccessibility by user's access
 * Used in queries to filter form events at database level
 * Handles -1 values in accessibility rules for ward/booth (means 'all')
 * Roles do NOT support -1 - must be explicit role IDs
 */
