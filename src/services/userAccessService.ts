import type { Transaction } from "sequelize";
import UserAccess from "../models/UserAccess";
import { ApiError } from "../middlewares/errorHandler";
import { parseLocalBodyType, parseSettlementType, type LocalBodyType, type SettlementType } from "../types/geo";

export interface AccessibleArea {
  stateId?: number;
  districtId?: number;
  talukId?: number;
  settlementType?: SettlementType;
  mainVillageId?: number;
  subVillageId?: number;
  governingBody?: LocalBodyType;
  localBodyType?: LocalBodyType;
  localBodyId?: number;
  gramPanchayatId?: number;
  hobaliId?: number;
  wardNumberId?: number;
  pollingStationId?: number;
  boothNumberId?: number;
  mlaConstituencyId?: number;
  mpConstituencyId?: number;
}

const ACCESS_NUMERIC_FIELDS = [
  "stateId",
  "districtId",
  "talukId",
  "mpConstituencyId",
  "mlaConstituencyId",
  "localBodyId",
  "hobaliId",
  "gramPanchayatId",
  "mainVillageId",
  "subVillageId",
  "wardNumberId",
  "pollingStationId",
  "boothNumberId"
] as const;

const parseScopedNumber = (
  value: unknown,
  fieldName: string,
  allowWildcard: boolean
): number | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  const minimum = allowWildcard ? -1 : 1;
  if (
    !Number.isInteger(parsed) ||
    parsed === 0 ||
    parsed < minimum ||
    (!allowWildcard && parsed < 1)
  ) {
    throw new ApiError(
      `${fieldName} must be a positive integer${allowWildcard ? " or -1" : ""}`,
      400
    );
  }

  return parsed;
};

const mapAccessToLegacyRow = (
  userId: number,
  accessRoleId: number,
  accessible: AccessibleArea,
  actorId: number
) => ({
  userId,
  accessRoleId,
  stateId: accessible.stateId ?? null,
  districtId: accessible.districtId ?? null,
  talukId: accessible.talukId ?? null,
  settlementType: accessible.settlementType ?? null,
  mainVillageId: accessible.mainVillageId ?? null,
  subVillageId: accessible.subVillageId ?? null,
  governingBody: accessible.governingBody ?? accessible.localBodyType ?? null,
  localBodyId: accessible.localBodyId ?? null,
  gramPanchayatId: accessible.gramPanchayatId ?? null,
  hobaliId: accessible.hobaliId ?? null,
  wardNumberId: accessible.wardNumberId ?? null,
  pollingStationId: accessible.pollingStationId ?? null,
  boothNumberId: accessible.boothNumberId ?? null,
  mlaConstituencyId: accessible.mlaConstituencyId ?? null,
  mpConstituencyId: accessible.mpConstituencyId ?? null,
  createdBy: actorId,
  updatedBy: actorId,
  status: 1
});

/**
 * Create user access entries for the given user
 */
export const createUserAccessProfiles = async (
  userId: number,
  accessRoleId: number,
  accessibles: AccessibleArea[],
  createdBy: number,
  options?: { transaction?: Transaction }
): Promise<UserAccess[]> => {
  if (!accessibles || accessibles.length === 0) {
    return [];
  }

  const accessData = accessibles.map((accessible) =>
    mapAccessToLegacyRow(userId, accessRoleId, accessible, createdBy)
  );

  const created = await UserAccess.bulkCreate(accessData, {
    transaction: options?.transaction
  });

  return created;
};

/**
 * Update user access entries:
 * 1. Set all existing access entries to status=0
 * 2. Recreate the compatibility rows from the latest request payload
 */
export const updateUserAccessProfiles = async (
  userId: number,
  accessRoleId: number,
  accessibles: AccessibleArea[],
  updatedBy: number,
  options?: { transaction?: Transaction }
): Promise<void> => {
  // Step 1: Set all existing access entries to status=0
  await UserAccess.update(
    { status: 0, updatedBy },
    {
      where: { userId },
      transaction: options?.transaction
    }
  );

  if (!accessibles || accessibles.length === 0) {
    return;
  }

  await UserAccess.bulkCreate(
    accessibles.map((accessible) => mapAccessToLegacyRow(userId, accessRoleId, accessible, updatedBy)),
    {
      transaction: options?.transaction
    }
  );
};

/**
 * Get all active access profiles for a user
 */
export const getUserAccessProfiles = async (userId: number): Promise<UserAccess[]> => {
  return UserAccess.findAll({
    where: { userId, status: 1 },
    include: [
      { association: "accessRole" },
      { association: "localBody" },
      { association: "wardNumber" },
      { association: "boothNumber" },
      { association: "mlaConstituency" }
    ]
  });
};

/**
 * Validate accessible areas input
 */
export const validateAccessibles = (accessibles: unknown): AccessibleArea[] => {
  if (!Array.isArray(accessibles)) {
    throw new ApiError("accessibles must be an array", 400);
  }

  if (accessibles.length === 0) {
    throw new ApiError("accessibles array cannot be empty", 400);
  }

  return accessibles.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new ApiError(`accessibles[${index}] must be an object`, 400);
    }

    const source = item as Record<string, unknown>;
    const result: AccessibleArea = {};

    ACCESS_NUMERIC_FIELDS.forEach((fieldName) => {
      const value = parseScopedNumber(source[fieldName], `accessibles[${index}].${fieldName}`, true);
      if (value !== undefined) {
        result[fieldName] = value as never;
      }
    });

    const settlementType = parseSettlementType(source["settlementType"]);
    if (source["settlementType"] !== undefined && !settlementType) {
      throw new ApiError(`accessibles[${index}].settlementType must be URBAN or RURAL`, 400);
    }
    if (settlementType) {
      result.settlementType = settlementType;
    }

    const governingBodyRaw =
      source["governingBody"] !== undefined ? source["governingBody"] : source["localBodyType"];
    const localBodyType = parseLocalBodyType(governingBodyRaw);
    if (governingBodyRaw !== undefined && !localBodyType) {
      throw new ApiError(
        `accessibles[${index}].governingBody must be one of GBA, CC, CMC, TMC, TP, GP`,
        400
      );
    }
    if (localBodyType) {
      result.governingBody = localBodyType;
      result.localBodyType = localBodyType;
    }

    if (
      result.settlementType === "RURAL" &&
      result.governingBody !== undefined &&
      result.governingBody !== "GP"
    ) {
      throw new ApiError(`accessibles[${index}] with settlementType=RURAL must use GP`, 400);
    }

    if (result.governingBody === "GP" && result.localBodyId && result.localBodyId !== -1) {
      throw new ApiError(
        `accessibles[${index}].localBodyId is not valid when governingBody is GP`,
        400
      );
    }

    if (
      result.governingBody === "GP" &&
      result.gramPanchayatId === undefined &&
      result.mainVillageId !== undefined
    ) {
      throw new ApiError(
        `accessibles[${index}].gramPanchayatId is required before mainVillageId in GP flow`,
        400
      );
    }

    if (ACCESS_NUMERIC_FIELDS.every((fieldName) => result[fieldName] === undefined)) {
      throw new ApiError(
        `accessibles[${index}] must include at least one numeric geo scope field`,
        400
      );
    }

    return result;
  });
};
