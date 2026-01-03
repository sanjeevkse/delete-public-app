import type { Transaction } from "sequelize";
import UserAccess from "../models/UserAccess";
import { ApiError } from "../middlewares/errorHandler";

export interface AccessibleArea {
  wardNumberId: number;
  boothNumberId: number;
  mlaConstituencyId?: number;
  mpConstituencyId?: number;
}

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

  const accessData = accessibles.map((accessible) => ({
    userId,
    accessRoleId,
    wardNumberId: accessible.wardNumberId,
    boothNumberId: accessible.boothNumberId,
    mlaConstituencyId: accessible.mlaConstituencyId ?? null,
    mpConstituencyId: accessible.mpConstituencyId ?? null,
    createdBy,
    updatedBy: createdBy,
    status: 1
  }));

  const created = await UserAccess.bulkCreate(accessData, {
    transaction: options?.transaction
  });

  return created;
};

/**
 * Update user access entries:
 * 1. Set all existing access entries to status=0
 * 2. For each accessible, check if it exists (same ward + booth):
 *    - If exists: set status=1
 *    - If not exists: create new entry
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

  // Step 2: For each accessible, check if it exists or create new
  for (const accessible of accessibles) {
    const existing = await UserAccess.findOne({
      where: {
        userId,
        wardNumberId: accessible.wardNumberId,
        boothNumberId: accessible.boothNumberId
      },
      transaction: options?.transaction
    });

    if (existing) {
      // Reactivate existing entry and update fields
      await existing.update(
        {
          status: 1,
          accessRoleId,
          mlaConstituencyId: accessible.mlaConstituencyId ?? null,
          mpConstituencyId: accessible.mpConstituencyId ?? null,
          updatedBy
        },
        { transaction: options?.transaction }
      );
    } else {
      // Create new entry
      await UserAccess.create(
        {
          userId,
          accessRoleId,
          wardNumberId: accessible.wardNumberId,
          boothNumberId: accessible.boothNumberId,
          mlaConstituencyId: accessible.mlaConstituencyId ?? null,
          mpConstituencyId: accessible.mpConstituencyId ?? null,
          createdBy: updatedBy,
          updatedBy,
          status: 1
        },
        { transaction: options?.transaction }
      );
    }
  }
};

/**
 * Get all active access profiles for a user
 */
export const getUserAccessProfiles = async (userId: number): Promise<UserAccess[]> => {
  return UserAccess.findAll({
    where: { userId, status: 1 },
    include: [
      { association: "accessRole" },
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

    const { wardNumberId, boothNumberId, mlaConstituencyId, mpConstituencyId } = item as Record<
      string,
      unknown
    >;

    if (
      !wardNumberId ||
      typeof wardNumberId !== "number" ||
      (wardNumberId !== -1 && wardNumberId <= 0)
    ) {
      throw new ApiError(
        `accessibles[${index}].wardNumberId must be a positive number or -1 for all wards`,
        400
      );
    }

    if (
      !boothNumberId ||
      typeof boothNumberId !== "number" ||
      (boothNumberId !== -1 && boothNumberId <= 0)
    ) {
      throw new ApiError(
        `accessibles[${index}].boothNumberId must be a positive number or -1 for all booths`,
        400
      );
    }

    const result: AccessibleArea = {
      wardNumberId,
      boothNumberId
    };

    // Optional fields
    if (mlaConstituencyId !== undefined && mlaConstituencyId !== null) {
      if (typeof mlaConstituencyId !== "number" || mlaConstituencyId <= 0) {
        throw new ApiError(
          `accessibles[${index}].mlaConstituencyId must be a positive number`,
          400
        );
      }
      result.mlaConstituencyId = mlaConstituencyId;
    }

    if (mpConstituencyId !== undefined && mpConstituencyId !== null) {
      if (typeof mpConstituencyId !== "number" || mpConstituencyId <= 0) {
        throw new ApiError(`accessibles[${index}].mpConstituencyId must be a positive number`, 400);
      }
      result.mpConstituencyId = mpConstituencyId;
    }

    return result;
  });
};
