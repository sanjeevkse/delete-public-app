import type { FindAttributeOptions, ProjectionAlias } from "sequelize";

/**
 * Standard audit fields that are excluded by default from query results
 */
export const AUDIT_FIELDS = ["createdBy", "createdAt", "updatedBy", "updatedAt", "status"] as const;

/**
 * Build attributes configuration for Sequelize queries
 * By default excludes audit fields (createdBy, createdAt, updatedBy, updatedAt, status)
 * 
 * @param options - Configuration options
 * @param options.includeAuditFields - If true, includes audit fields in the result (default: false)
 * @param options.exclude - Additional fields to exclude from the result
 * @param options.include - Additional fields or expressions to include (for computed fields, aggregations, etc.)
 * @returns Sequelize FindAttributeOptions object
 * 
 * @example
 * // Exclude audit fields (default behavior)
 * const attrs = buildQueryAttributes();
 * 
 * @example
 * // Include audit fields
 * const attrs = buildQueryAttributes({ includeAuditFields: true });
 * 
 * @example
 * // Exclude audit fields and additional custom fields
 * const attrs = buildQueryAttributes({ exclude: ['internalNotes', 'deletedAt'] });
 * 
 * @example
 * // Include computed fields with audit exclusion
 * const attrs = buildQueryAttributes({ 
 *   include: [[sequelize.fn('COUNT', sequelize.col('posts.id')), 'postCount']]
 * });
 */
export function buildQueryAttributes(options?: {
  includeAuditFields?: boolean;
  exclude?: string[];
  include?: Array<string | ProjectionAlias>;
}): FindAttributeOptions | undefined {
  const { includeAuditFields = false, exclude = [], include = [] } = options ?? {};

  const excludeFields = includeAuditFields 
    ? exclude 
    : [...AUDIT_FIELDS, ...exclude];

  if (excludeFields.length === 0 && include.length === 0) {
    return undefined;
  }

  const result: { exclude?: string[]; include?: Array<string | ProjectionAlias> } = {};

  if (excludeFields.length > 0) {
    result.exclude = excludeFields;
  }

  if (include.length > 0) {
    result.include = include;
  }

  return result as FindAttributeOptions;
}

/**
 * Check if a query option requests audit fields to be included
 * Looks for 'includeAudit', 'includeAuditFields', or 'withAudit' query parameters
 * 
 * @param query - Express request query object
 * @returns true if audit fields should be included
 * 
 * @example
 * // In a controller
 * const includeAudit = shouldIncludeAuditFields(req.query);
 * const attributes = buildQueryAttributes({ includeAuditFields: includeAudit });
 */
export function shouldIncludeAuditFields(query: any): boolean {
  return (
    query?.includeAudit === "true" ||
    query?.includeAuditFields === "true" ||
    query?.withAudit === "true"
  );
}
