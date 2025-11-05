import { ApiError } from "../middlewares/errorHandler";

const normalizeFieldName = (field: string): string =>
  field
    .replace(/_/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();

const DEFAULT_RESTRICTED_FIELDS = new Map<string, string>([
  ["status", "status"],
  ["createdat", "created_at"],
  ["updatedat", "updated_at"],
  ["createdby", "created_by"],
  ["updatedby", "updated_by"],
  ["deletedat", "deleted_at"],
  ["deletedby", "deleted_by"]
]);

type AssertNoRestrictedFieldsOptions = {
  /**
   * Field names (camelCase or snake_case) that should be allowed even if they match the default restricted set.
   */
  allow?: string[];
  /**
   * Custom restricted field mappings. Keys are matched loosely (case-insensitive, underscores removed).
   */
  restrictedFields?: Map<string, string>;
};

const toNormalizedLookup = (fields?: string[]): Set<string> => {
  if (!fields || fields.length === 0) {
    return new Set<string>();
  }

  return new Set(fields.map((field) => normalizeFieldName(field)));
};

const resolveRestrictedFieldMap = (
  customRestrictedFields?: Map<string, string>
): Map<string, string> => {
  if (!customRestrictedFields) {
    return DEFAULT_RESTRICTED_FIELDS;
  }

  const merged = new Map(DEFAULT_RESTRICTED_FIELDS);
  for (const [key, value] of customRestrictedFields.entries()) {
    merged.set(normalizeFieldName(key), value);
  }
  return merged;
};

/**
 * Throws an ApiError when the request payload attempts to set restricted fields such as audit columns.
 */
export const assertNoRestrictedFields = (
  payload: unknown,
  options: AssertNoRestrictedFieldsOptions = {}
): void => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return;
  }

  const allowed = toNormalizedLookup(options.allow);
  const restrictedFields = resolveRestrictedFieldMap(options.restrictedFields);

  for (const key of Object.keys(payload as Record<string, unknown>)) {
    const normalizedKey = normalizeFieldName(key);
    if (allowed.has(normalizedKey)) {
      continue;
    }

    const restricted = restrictedFields.get(normalizedKey);
    if (restricted) {
      throw new ApiError(`${restricted} cannot be set manually`, 400);
    }
  }
};
