import type { IncludeOptions } from "sequelize";
import { Op } from "sequelize";
import FormEventAccessibility from "../models/FormEventAccessibility";
import MetaWardNumber from "../models/MetaWardNumber";
import MetaBoothNumber from "../models/MetaBoothNumber";
import MetaUserRole from "../models/MetaUserRole";
import UserProfile from "../models/UserProfile";
import UserRole from "../models/UserRole";
import { ApiError } from "../middlewares/errorHandler";
import { getEffectiveWardBoothAccess, isAccessibleToAll } from "./userAccessibilityService";
import { resolveGeoUnitRecordFromSource } from "./geoUnitService";

/**
 * Accessibility payload for FormEvent
 * Defines which geographic area + role combination can access a form event
 */
export interface AccessibilityPayload {
  geoUnitId?: number | null;
  stateId?: number | null;
  districtId?: number | null;
  talukId?: number | null;
  mpConstituencyId?: number | null;
  mlaConstituencyId?: number | null;
  settlementType?: "URBAN" | "RURAL" | null;
  governingBody?: "GBA" | "CC" | "CMC" | "TMC" | "TP" | "GP" | null;
  localBodyId?: number | null;
  hobaliId?: number | null;
  gramPanchayatId?: number | null;
  mainVillageId?: number | null;
  subVillageId?: number | null;
  pollingStationId?: number | null;
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
        const suffix = allowAll ? " or -1 for all" : "";
        throw new ApiError(
          `accessibility[${index}].${fieldName} must be a positive integer${suffix}`,
          400
        );
      }
      return num;
    };

    const rawRecord = item as Record<string, unknown>;
    const hasBroaderGeoInput = [
      "stateId",
      "districtId",
      "talukId",
      "mpConstituencyId",
      "mlaConstituencyId",
      "settlementType",
      "governingBody",
      "localBodyId",
      "hobaliId",
      "gramPanchayatId",
      "mainVillageId",
      "subVillageId",
      "pollingStationId"
    ].some((field) => rawRecord[field] !== undefined && rawRecord[field] !== null && rawRecord[field] !== "");

    const parsedWard =
      wardNumberId === undefined || wardNumberId === null || wardNumberId === ""
        ? (hasBroaderGeoInput ? null : parseNumber(wardNumberId, "wardNumberId", true))
        : parseNumber(wardNumberId, "wardNumberId", true);

    const parsedBooth =
      boothNumberId === undefined || boothNumberId === null || boothNumberId === ""
        ? (hasBroaderGeoInput ? null : parseNumber(boothNumberId, "boothNumberId", true))
        : parseNumber(boothNumberId, "boothNumberId", true);

    return {
      ...rawRecord,
      wardNumberId: parsedWard as number,
      boothNumberId: parsedBooth as number,
      userRoleId: parseNumber(userRoleId, "userRoleId", true) // Allow -1 for "all roles"
    } as AccessibilityPayload;
  });
};

/**
 * Verify that all referenced IDs (ward, booth, role) exist in the database
 * Validates referential integrity before creating/updating accessibility rules
 */
export const ensureAccessibilityReferencesExist = async (
  records: AccessibilityPayload[]
): Promise<void> => {
  for (const record of records) {
    const hasWildcard = record.wardNumberId === -1 || record.boothNumberId === -1;
    const resolvedGeoUnit = hasWildcard
      ? undefined
      : await resolveGeoUnitRecordFromSource(record as unknown as Record<string, unknown>);

    if (resolvedGeoUnit) {
      record.geoUnitId = resolvedGeoUnit.id;
      record.wardNumberId = resolvedGeoUnit.wardNumberId ?? record.wardNumberId;
      record.boothNumberId = resolvedGeoUnit.boothNumberId ?? record.boothNumberId;
    } else if (!hasWildcard && (record.wardNumberId <= 0 || record.boothNumberId <= 0)) {
      throw new ApiError(
        "Accessibility entries must provide ward/booth or a fuller exact geo leaf selection",
        400
      );
    }
  }

  // Filter out -1 values (which mean 'all' and don't need to exist in the database)
  const wardIds = Array.from(
    new Set(records.map((item) => item.wardNumberId).filter((id) => id !== -1))
  );
  const boothIds = Array.from(
    new Set(records.map((item) => item.boothNumberId).filter((id) => id !== -1))
  );
  const roleIds = Array.from(
    new Set(records.map((item) => item.userRoleId).filter((id) => id !== -1))
  );

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
  accessCombos: Array<{
    wardNumberId: number | null;
    boothNumberId: number | null;
  }>;
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

  const effectiveAccess = await getEffectiveWardBoothAccess(userId);
  const accessCombos = effectiveAccess.unrestricted
    ? [{ wardNumberId: -1, boothNumberId: -1 }]
    : effectiveAccess.rows.length > 0
      ? effectiveAccess.rows.map((row) => ({
          wardNumberId: row.wardNumberId,
          boothNumberId: row.boothNumberId
        }))
      : [{ wardNumberId: profile?.wardNumberId ?? null, boothNumberId: profile?.boothNumberId ?? null }];

  return {
    accessCombos,
    roleIds: roles.map((r) => r.roleId)
  };
};

/**
 * Check if a user can access a specific form event
 * Returns true if user's ward+booth+role matches any accessibility rule for the event
 * Handles -1 values in accessibility rules (means 'all')
 */
export const canUserAccessFormEvent = async (
  userId: number,
  formEventId: number
): Promise<boolean> => {
  const userAccess = await getUserAccessProfile(userId);

  const validAccessCombos = userAccess.accessCombos.filter(
    (combo) =>
      combo.wardNumberId === -1 ||
      combo.boothNumberId === -1 ||
      combo.wardNumberId !== null ||
      combo.boothNumberId !== null
  );

  if (validAccessCombos.length === 0) {
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

  // Check if user's geography and role matches any rule (considering -1 as 'all')
  return accessibilityRules.some((rule: any) => {
    // Check role match (-1 means all roles, otherwise exact match)
    const roleMatches =
      isAccessibleToAll(rule.userRoleId) || userAccess.roleIds.includes(rule.userRoleId);

    return (
      roleMatches &&
      validAccessCombos.some((combo) => {
        const wardMatches =
          isAccessibleToAll(rule.wardNumberId) || rule.wardNumberId === combo.wardNumberId;
        const boothMatches =
          isAccessibleToAll(rule.boothNumberId) || rule.boothNumberId === combo.boothNumberId;
        return wardMatches && boothMatches;
      })
    );
  });
};

/**
 * Build WHERE clause for filtering FormEventAccessibility by user's access
 * Used in queries to filter form events at database level
 * Handles -1 values in accessibility rules for ward/booth (means 'all')
 * Roles do NOT support -1 - must be explicit role IDs
 */
