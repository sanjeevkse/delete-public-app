import { Op } from "sequelize";
import MetaUserRole from "../models/MetaUserRole";
import UserAccess from "../models/UserAccess";
import UserRole from "../models/UserRole";
import { ApiError } from "../middlewares/errorHandler";
import {
  buildAccessibilityORConditions,
  buildAccessibilityFilterWithFlag,
  getUserAccessList
} from "./userAccessibilityService";

/**
 * Get all descendant role IDs for a given role using depthPath
 * depthPath format: /1/9/10 means role 10 is under 9 is under 1
 * Returns the role ID itself plus all roles below it
 */
export const getDescendantRoleIds = async (roleId: number): Promise<number[]> => {
  // Get the role's depthPath
  const role = await MetaUserRole.findByPk(roleId, {
    attributes: ["depthPath"],
    raw: true
  });

  if (!role || !role.depthPath) {
    return [roleId]; // Just return the role itself if no depthPath
  }

  // Find all roles whose depthPath starts with this role's depthPath
  // e.g., if this role is /1/9, find roles like /1/9/10, /1/9/10/11, etc.
  const descendantRoles = await MetaUserRole.findAll({
    where: {
      [Op.or]: [
        // Exact match (the role itself)
        { depthPath: role.depthPath },
        // Starts with the depthPath followed by / (direct and indirect children)
        { depthPath: { [Op.like]: `${role.depthPath}/%` } }
      ],
      status: 1
    },
    attributes: ["id"],
    raw: true
  });

  return descendantRoles.map((r) => r.id);
};

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
 * Checks both role hierarchy (using depthPath) and accessibility constraints
 */
export const canManageUser = async (
  loggedInUserId: number,
  loggedInUserRoles: number[],
  targetUserId: number,
  targetUserRoles: number[]
): Promise<boolean> => {
  // Check role hierarchy: target roles must be descendants of logged-in user's roles
  if (loggedInUserRoles.length > 0 && targetUserRoles.length > 0) {
    let hasValidRole = false;

    for (const loggedInRoleId of loggedInUserRoles) {
      const allowedDescendantRoles = await getDescendantRoleIds(loggedInRoleId);
      const hasAllowedRole = targetUserRoles.some((roleId) =>
        allowedDescendantRoles.includes(roleId)
      );
      if (hasAllowedRole) {
        hasValidRole = true;
        break;
      }
    }

    if (!hasValidRole) {
      return false; // Target user's roles are not under logged-in user's roles
    }
  }

  // Check accessibility constraints
  const accessibilityConstraints = await getAccessibilityConstraints(loggedInUserId);

  if (Object.keys(accessibilityConstraints).length === 0) {
    return true; // No accessibility constraints, role check passed
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

/**
 * Build accessibility filter for listing users (ward/booth only).
 * Handles -1 as "all" for ward or booth and avoids duplicates.
 */
export const buildUserListingAccessibilityFilter = async (
  loggedInUserId: number
): Promise<Record<string, any> | null> => {
  const loggedInAccess = await getUserAccessList(loggedInUserId);

  if (loggedInAccess.length === 0) {
    return null; // No accessibility constraints
  }

  const conditions: Array<Record<string, any>> = [];
  const seen = new Set<string>();

  for (const access of loggedInAccess) {
    const wardNumberId = access.wardNumberId;
    const boothNumberId = access.boothNumberId;

    if (wardNumberId === -1 && boothNumberId === -1) {
      return null; // Access to all wards and booths
    }

    const condition: Record<string, any> = {};

    if (wardNumberId !== -1 && wardNumberId !== null && wardNumberId !== undefined) {
      condition.wardNumberId = wardNumberId;
    }

    if (boothNumberId !== -1 && boothNumberId !== null && boothNumberId !== undefined) {
      condition.boothNumberId = boothNumberId;
    }

    if (Object.keys(condition).length === 0) {
      continue;
    }

    const key = JSON.stringify(condition);
    if (!seen.has(key)) {
      seen.add(key);
      conditions.push(condition);
    }
  }

  if (conditions.length === 0) {
    return null;
  }

  return { [Op.or]: conditions };
};
