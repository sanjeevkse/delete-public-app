import { Op } from "sequelize";
import MetaUserRole from "../models/MetaUserRole";
import UserAccess from "../models/UserAccess";
import { ApiError } from "../middlewares/errorHandler";
import {
  buildAccessibilityORConditions,
  buildAccessibilityFilterWithFlag,
  getUserAccessList
} from "./userAccessibilityService";

/**
 * Get accessibility constraints for a logged-in user
 * Compares user's accessibility with target user's accessibility
 * Returns WHERE clause conditions for filtering
 */
export const getAccessibilityConstraints = async (
  loggedInUserId: number
): Promise<Record<string, any>> => {
  const loggedInAccess = await getUserAccessList(loggedInUserId);

  if (loggedInAccess.length === 0) {
    // If logged-in user has no accessibility configured, allow all
    return {};
  }

  const orConditions = buildAccessibilityORConditions(loggedInAccess);
  return orConditions || {};
};

/**
 * Validate if logged-in user can manage a target user
 * Checks accessibility constraints only (role hierarchy has been removed)
 */
export const canManageUser = async (
  loggedInUserId: number,
  loggedInUserRoles: number[],
  targetUserId: number,
  targetUserRoles: number[]
): Promise<boolean> => {
  // Check accessibility constraints
  const accessibilityConstraints = await getAccessibilityConstraints(loggedInUserId);

  if (Object.keys(accessibilityConstraints).length === 0) {
    return true; // No accessibility constraints
  }

  // Get target user's accessibility
  const targetAccess = await UserAccess.findAll({
    where: { userId: targetUserId, status: 1 },
    attributes: [
      "stateId",
      "districtId",
      "talukId",
      "mainVillageId",
      "subVillageId",
      "mpConstituencyId",
      "mlaConstituencyId",
      "wardNumberId",
      "boothNumberId"
    ],
    raw: true
  });

  if (targetAccess.length === 0) {
    // Target user has no accessibility constraints, can't manage them
    return false;
  }

  // Check if target user's accessibility matches logged-in user's accessibility
  const loggedInAccess = await UserAccess.findAll({
    where: { userId: loggedInUserId, status: 1 },
    attributes: [
      "stateId",
      "districtId",
      "talukId",
      "mainVillageId",
      "subVillageId",
      "mpConstituencyId",
      "mlaConstituencyId",
      "wardNumberId",
      "boothNumberId"
    ],
    raw: true
  });

  // At least one of the target user's accessibility profiles must match
  // one of the logged-in user's accessibility profiles
  return targetAccess.some((targetA) =>
    loggedInAccess.some((loggedInA) => {
      // Compare key accessibility fields
      return (
        (targetA.stateId === null || targetA.stateId === loggedInA.stateId) &&
        (targetA.districtId === null || targetA.districtId === loggedInA.districtId) &&
        (targetA.talukId === null || targetA.talukId === loggedInA.talukId) &&
        (targetA.mainVillageId === null || targetA.mainVillageId === loggedInA.mainVillageId) &&
        (targetA.subVillageId === null || targetA.subVillageId === loggedInA.subVillageId) &&
        (targetA.mpConstituencyId === null ||
          targetA.mpConstituencyId === loggedInA.mpConstituencyId) &&
        (targetA.mlaConstituencyId === null ||
          targetA.mlaConstituencyId === loggedInA.mlaConstituencyId) &&
        (targetA.wardNumberId === null || targetA.wardNumberId === loggedInA.wardNumberId) &&
        (targetA.boothNumberId === null || targetA.boothNumberId === loggedInA.boothNumberId)
      );
    })
  );
};

/**
 * Build accessibility filter for listing users
 * Creates WHERE clause to only show users in accessible zones
 */
export const buildAccessibilityFilter = async (
  loggedInUserId: number
): Promise<Record<string, any> | null> => {
  const loggedInAccess = await getUserAccessList(loggedInUserId);

  if (loggedInAccess.length === 0) {
    return null; // No accessibility constraints
  }

  const orConditions = buildAccessibilityORConditions(loggedInAccess);
  return orConditions;
};
