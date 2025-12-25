import { Op } from "sequelize";
import MetaUserRole from "../models/MetaUserRole";
import UserAccess from "../models/UserAccess";
import { ApiError } from "../middlewares/errorHandler";

/**
 * Get all descendant role IDs for a given role (children, grandchildren, etc.)
 * Returns the role ID itself plus all roles below it in the hierarchy
 */
export const getDescendantRoleIds = async (roleId: number): Promise<number[]> => {
  const descendants: number[] = [roleId];
  const queue: number[] = [roleId];

  while (queue.length > 0) {
    const currentRoleId = queue.shift();
    if (!currentRoleId) break;

    const childRoles = await MetaUserRole.findAll({
      where: { metaUserRoleId: currentRoleId, status: 1 },
      attributes: ["id"],
      raw: true
    });

    childRoles.forEach((child) => {
      descendants.push(child.id);
      queue.push(child.id);
    });
  }

  return descendants;
};

/**
 * Get all ancestor role IDs for a given role (parent, grandparent, etc.)
 * Returns the role ID itself plus all roles above it in the hierarchy
 */
export const getAncestorRoleIds = async (roleId: number): Promise<number[]> => {
  const ancestors: number[] = [roleId];
  let currentRoleId: number | null = roleId;

  while (currentRoleId) {
    const role = (await MetaUserRole.findByPk(currentRoleId, {
      attributes: ["metaUserRoleId"],
      raw: true
    })) as { metaUserRoleId: number | null } | null;

    if (role && role.metaUserRoleId) {
      ancestors.push(role.metaUserRoleId);
      currentRoleId = role.metaUserRoleId;
    } else {
      break;
    }
  }

  return ancestors;
};

/**
 * Get all users who have roles that are descendants of the logged-in user's role
 * This allows a user to manage only people below/under their role hierarchy
 */
export const getUsersWithRoleHierarchy = async (loggedInUserRoles: number[]): Promise<number[]> => {
  if (loggedInUserRoles.length === 0) {
    return [];
  }

  // Get all descendant roles for each of the logged-in user's roles
  const allDescendantRoles: Set<number> = new Set();

  for (const roleId of loggedInUserRoles) {
    const descendants = await getDescendantRoleIds(roleId);
    descendants.forEach((id) => allDescendantRoles.add(id));
  }

  return Array.from(allDescendantRoles);
};

/**
 * Get accessibility constraints for a logged-in user
 * Compares user's accessibility with target user's accessibility
 * Returns WHERE clause conditions for filtering
 */
export const getAccessibilityConstraints = async (
  loggedInUserId: number
): Promise<Record<string, any>> => {
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

  if (loggedInAccess.length === 0) {
    // If logged-in user has no accessibility configured, allow all
    return {};
  }

  // Build OR conditions - user can access others if they share the same accessibility level
  const accessibilityOR: Array<Record<string, any>> = [];

  for (const access of loggedInAccess) {
    const condition: Record<string, any> = {};

    // Add accessibility constraints
    if (access.stateId) condition.stateId = access.stateId;
    if (access.districtId) condition.districtId = access.districtId;
    if (access.talukId) condition.talukId = access.talukId;
    if (access.mainVillageId) condition.mainVillageId = access.mainVillageId;
    if (access.subVillageId) condition.subVillageId = access.subVillageId;
    if (access.mpConstituencyId) condition.mpConstituencyId = access.mpConstituencyId;
    if (access.mlaConstituencyId) condition.mlaConstituencyId = access.mlaConstituencyId;
    if (access.wardNumberId) condition.wardNumberId = access.wardNumberId;
    if (access.boothNumberId) condition.boothNumberId = access.boothNumberId;

    if (Object.keys(condition).length > 0) {
      accessibilityOR.push(condition);
    }
  }

  if (accessibilityOR.length === 0) {
    return {};
  }

  return { [Op.or]: accessibilityOR };
};

/**
 * Validate if logged-in user can manage a target user
 * Checks both role hierarchy and accessibility constraints
 */
export const canManageUser = async (
  loggedInUserId: number,
  loggedInUserRoles: number[],
  targetUserId: number,
  targetUserRoles: number[]
): Promise<boolean> => {
  // Get allowed descendant roles
  const allowedDescendantRoles = await getUsersWithRoleHierarchy(loggedInUserRoles);

  // Check if target user has at least one role in allowed descendants
  const hasAllowedRole = targetUserRoles.some((roleId) => allowedDescendantRoles.includes(roleId));

  if (!hasAllowedRole) {
    return false;
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
  const loggedInAccess = await UserAccess.findAll({
    where: { userId: loggedInUserId, status: 1 },
    raw: true
  });

  if (loggedInAccess.length === 0) {
    return null; // No accessibility constraints
  }

  // Build conditions for each accessibility dimension
  const conditions: Array<Record<string, any>> = [];

  for (const access of loggedInAccess) {
    const condition: Record<string, any> = {};

    // Match on ANY of the accessibility dimensions that are set
    if (access.stateId) condition.stateId = access.stateId;
    if (access.districtId) condition.districtId = access.districtId;
    if (access.talukId) condition.talukId = access.talukId;
    if (access.mainVillageId) condition.mainVillageId = access.mainVillageId;
    if (access.subVillageId) condition.subVillageId = access.subVillageId;
    if (access.mpConstituencyId) condition.mpConstituencyId = access.mpConstituencyId;
    if (access.mlaConstituencyId) condition.mlaConstituencyId = access.mlaConstituencyId;
    if (access.wardNumberId) condition.wardNumberId = access.wardNumberId;
    if (access.boothNumberId) condition.boothNumberId = access.boothNumberId;

    if (Object.keys(condition).length > 0) {
      conditions.push(condition);
    }
  }

  if (conditions.length === 0) {
    return null;
  }

  return { [Op.or]: conditions };
};
