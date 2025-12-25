import { Op } from "sequelize";
import {
  getAccessibilityValues,
  hasAccessToItem,
  buildAccessibilityFilterWithFlag,
  getUserAccessList
} from "../services/userAccessibilityService";

/**
 * Apply accessibility filter to where clause for list endpoints
 * Mutates whereClause object to add ID filtering
 *
 * @param whereClause - Sequelize WHERE clause object (will be mutated)
 * @param userAccessList - User's accessibility records
 * @param fieldName - Field name to filter by (e.g., 'wardNumberId', 'boothNumberId')
 * @returns true if filter was applied, false if user has no access
 */
export const applyAccessibilityFilterToList = (
  whereClause: any,
  userAccessList: any[],
  fieldName: string
): boolean => {
  if (userAccessList.length === 0) {
    return true; // No accessibility configured = access all
  }

  const accessValues = getAccessibilityValues(userAccessList, fieldName);

  if (accessValues === "ALL") {
    return true;
  }

  if (accessValues.length === 0) {
    // User has accessibility configured but no access to this field
    return false;
  }

  whereClause.id = { [Op.in]: accessValues };
  return true;
};

/**
 * Validate if user has access to a specific item
 * Used in getById endpoints
 *
 * @param userAccessList - User's accessibility records
 * @param itemId - ID of the item being accessed
 * @param fieldName - Field name to check (e.g., 'wardNumberId', 'boothNumberId')
 * @returns true if user has access, false otherwise
 */
export const validateItemAccess = (
  userAccessList: any[],
  itemId: number,
  fieldName: string
): boolean => {
  return hasAccessToItem(userAccessList, itemId, fieldName);
};

/**
 * Get filtered accessible IDs for a field
 * Returns 'ALL' if user can access all, array of IDs if limited, or empty array if no access
 *
 * @param userAccessList - User's accessibility records
 * @param fieldName - Field name (e.g., 'wardNumberId', 'boothNumberId')
 * @returns Array of accessible IDs, 'ALL' for unlimited access, or empty array for no access
 */
export const getAccessibleIds = (userAccessList: any[], fieldName: string): number[] | "ALL" => {
  return getAccessibilityValues(userAccessList, fieldName);
};

/**
 * Get list of accessible values with canAccessAll flag
 * Useful for conditional logic in controllers
 *
 * @param userAccessList - User's accessibility records
 * @param fieldName - Field name (e.g., 'wardNumberId', 'boothNumberId')
 * @returns Object with whereClause and canAccessAll boolean
 */
export const getAccessibilityFilterWithFlag = async (
  userAccessList: any[],
  fieldName: string
): Promise<{ whereClause: any; canAccessAll: boolean }> => {
  return buildAccessibilityFilterWithFlag(userAccessList, fieldName);
};

/**
 * Check if user should return empty list or access denied
 * Returns true if user has accessibility configured, false if no accessibility at all
 */
export const userHasAccessibilityConfigured = (userAccessList: any[]): boolean => {
  return userAccessList.length > 0;
};

/**
 * Combine multiple field accessibility checks for compound filters
 * Useful when filtering by both ward and booth
 *
 * @example
 * // For ward filter with booth ID filtering
 * const wardFilter = combineAccessibilityFilters(
 *   userAccessList,
 *   'wardNumberId',
 *   'boothNumberId'
 * );
 */
export const combineAccessibilityFilters = (
  userAccessList: any[],
  ...fieldNames: string[]
): any => {
  if (userAccessList.length === 0) {
    return {}; // No filters
  }

  const filters: any[] = [];

  for (const fieldName of fieldNames) {
    const accessValues = getAccessibilityValues(userAccessList, fieldName);

    if (accessValues === "ALL") {
      continue; // This field has no restrictions
    }

    if (accessValues.length === 0) {
      // No access to this field
      return { id: { [Op.in]: [] } }; // Return no results
    }

    filters.push({ id: { [Op.in]: accessValues } });
  }

  if (filters.length === 0) {
    return {}; // No filters applied
  }

  if (filters.length === 1) {
    return filters[0];
  }

  // Multiple filters - AND them together
  return { [Op.and]: filters };
};
