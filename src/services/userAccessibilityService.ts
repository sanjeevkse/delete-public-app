import { Op } from "sequelize";
import UserAccess from "../models/UserAccess";

/**
 * Check if a value represents "all" (i.e., -1)
 * When -1 is set for a field, it means the user has access to all values for that field
 */
export const isAccessibleToAll = (value: number | null | undefined): boolean => {
  return value === -1;
};

/**
 * Get accessible IDs for a specific field from user's accessibility list
 * Returns 'ALL' if user has -1 access, or array of specific IDs
 */
export const getAccessibilityValues = (
  userAccessList: any[],
  fieldName: string
): number[] | "ALL" => {
  if (userAccessList.length === 0) {
    return "ALL"; // No accessibility configured = access all
  }

  // Check if user has -1 (all) for this field
  const hasAllAccess = userAccessList.some((access) => access[fieldName] === -1);
  if (hasAllAccess) {
    return "ALL";
  }

  // Collect specific IDs (excluding null and -1)
  const ids = userAccessList
    .map((access) => access[fieldName])
    .filter((id): id is number => id !== null && id !== undefined && id !== -1);

  return ids.length > 0 ? ids : [];
};

/**
 * Check if user can access a specific item by ID
 * Handles both -1 (all) and specific ID matching
 */
export const hasAccessToItem = (
  userAccessList: any[],
  itemId: number,
  fieldName: string
): boolean => {
  if (userAccessList.length === 0) {
    return true; // No accessibility configured = access all
  }

  // Check if user has -1 (all) for this field
  const hasAllAccess = userAccessList.some((access) => access[fieldName] === -1);
  if (hasAllAccess) {
    return true;
  }

  // Check if user has specific access to this item
  return userAccessList.some((access) => access[fieldName] === itemId);
};

/**
 * Build accessibility constraint for a single access profile
 * Filters out null, undefined, and -1 values automatically
 * Returns WHERE clause object for Sequelize queries
 */
export const buildAccessibilityConstraint = (
  access: any,
  excludeFields: string[] = []
): Record<string, any> => {
  const condition: Record<string, any> = {};

  const fields = [
    "stateId",
    "districtId",
    "talukId",
    "mainVillageId",
    "subVillageId",
    "mpConstituencyId",
    "mlaConstituencyId",
    "wardNumberId",
    "boothNumberId",
    "pollingStationId",
    "zillaPanchayatId",
    "talukPanchayatId",
    "gramPanchayatId",
    "hobaliId"
  ];

  for (const field of fields) {
    if (excludeFields.includes(field)) continue;

    const value = access[field];
    // Include if value is not null, undefined, or -1
    if (value && value !== -1) {
      condition[field] = value;
    }
  }

  return condition;
};

/**
 * Build accessibility filter for listing items
 * Returns WHERE clause and whether user can access all items
 */
export const buildAccessibilityFilterWithFlag = async (
  userAccessList: any[],
  fieldName: string
): Promise<{ whereClause: any; canAccessAll: boolean }> => {
  if (userAccessList.length === 0) {
    return { whereClause: {}, canAccessAll: true };
  }

  const accessValues = getAccessibilityValues(userAccessList, fieldName);

  if (accessValues === "ALL") {
    return { whereClause: {}, canAccessAll: true };
  }

  if (accessValues.length === 0) {
    // User has accessibility configured but no access to this field
    return { whereClause: { id: { [Op.in]: [] } }, canAccessAll: false };
  }

  return {
    whereClause: { id: { [Op.in]: accessValues } },
    canAccessAll: false
  };
};

/**
 * Build OR conditions for accessibility constraints
 * Used when user has multiple accessibility profiles
 */
export const buildAccessibilityORConditions = (
  userAccessList: any[],
  excludeFields: string[] = []
): Record<string, any> | null => {
  if (userAccessList.length === 0) {
    return null; // No accessibility constraints
  }

  const conditions: Array<Record<string, any>> = [];

  for (const access of userAccessList) {
    const condition = buildAccessibilityConstraint(access, excludeFields);

    if (Object.keys(condition).length > 0) {
      conditions.push(condition);
    }
  }

  if (conditions.length === 0) {
    return null;
  }

  return { [Op.or]: conditions };
};

/**
 * Fetch user's accessibility list from database
 */
export const getUserAccessList = async (userId: number): Promise<any[]> => {
  return await UserAccess.findAll({
    where: { userId, status: 1 },
    attributes: [
      "stateId",
      "districtId",
      "talukId",
      "mainVillageId",
      "subVillageId",
      "mpConstituencyId",
      "mlaConstituencyId",
      "wardNumberId",
      "boothNumberId",
      "pollingStationId",
      "zillaPanchayatId",
      "talukPanchayatId",
      "gramPanchayatId",
      "hobaliId"
    ],
    raw: true
  });
};

/**
 * Validate accessibility for a list of items
 * Returns items that user has access to based on a specific field
 */
export const filterItemsByAccessibility = <T>(
  items: T[],
  userAccessList: any[],
  accessor: (item: T) => number | null | undefined,
  fieldName: string = "id"
): T[] => {
  if (userAccessList.length === 0) {
    return items; // No accessibility configured = access all
  }

  const accessValues = getAccessibilityValues(userAccessList, fieldName);

  if (accessValues === "ALL") {
    return items;
  }

  return items.filter((item) => {
    const itemId = accessor(item);
    return itemId !== null && itemId !== undefined && accessValues.includes(itemId);
  });
};
