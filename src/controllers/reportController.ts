import type { Response } from "express";
import { Op } from "sequelize";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { requireAuthenticatedUser } from "../middlewares/authMiddleware";
import { ApiError } from "../middlewares/errorHandler";
import asyncHandler from "../utils/asyncHandler";
import {
  calculatePagination,
  parsePaginationParams,
  sendSuccess,
  sendSuccessWithPagination
} from "../utils/apiResponse";
import FormEvent from "../models/FormEvent";
import FormSubmission from "../models/FormSubmission";
import FormFieldValue from "../models/FormFieldValue";
import Form from "../models/Form";
import FormField from "../models/FormField";
import FormFieldOption from "../models/FormFieldOption";
import UserRole from "../models/UserRole";
import User from "../models/User";
import UserProfile from "../models/UserProfile";
import UserAccess from "../models/UserAccess";
import { getMetaTableByTableName } from "../utils/metaTableRegistry";
import {
  resolveSubmittedUserValue,
  SUBMITTED_USER_REPORT_FIELDS
} from "../utils/submittedUserFields";
import { getDescendantRoleIds } from "../services/userHierarchyService";
import {
  enrichAdminRolePermissions,
  getRoleIdsByNames,
  parseRoleIdsInput
} from "../services/rbacService";

const DATE_FIELD_TYPES = new Set(["date"]);
const TIME_FIELD_TYPES = new Set(["time"]);
const DATETIME_FIELD_TYPES = new Set(["datetime"]);
const DROPDOWN_FIELD_TYPES = new Set(["select", "dropdown"]);
const DATE_INPUT_FORMATS = new Set([7]);
const TIME_INPUT_FORMATS = new Set([8]);
const DATETIME_INPUT_FORMATS = new Set([9]);
const WARD_BOOTH_FIELD_KEYS = new Set(["__ward_number_id", "__booth_number_id"]);
const WARD_BOOTH_META_TABLES = new Map<string, string>([
  ["__ward_number_id", "tbl_meta_ward_number"],
  ["__booth_number_id", "tbl_meta_booth_number"]
]);

const pad2 = (num: number) => String(num).padStart(2, "0");
const IST_TIMEZONE = "Asia/Kolkata";

const formatDateTimeIst = (value: Date): string => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).formatToParts(value);

  const byType: Record<string, string> = {};
  for (const part of parts) {
    byType[part.type] = part.value;
  }

  const dayPeriod = (byType.dayPeriod || "").toUpperCase();
  return `${byType.day}-${byType.month}-${byType.year} ${byType.hour}:${byType.minute} ${dayPeriod}`;
};

const formatDateOnlyValue = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, yyyy, mm, dd] = match;
    return `${dd}-${mm}-${yyyy}`;
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return `${pad2(date.getDate())}-${pad2(date.getMonth() + 1)}-${date.getFullYear()}`;
};

const formatTimeOnlyValue = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (match) {
    const [, hh, mm, ss] = match;
    return `${hh}:${mm}:${ss ?? "00"}`;
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
};

const formatDateTimeValue = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const hasExplicitTimezone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed);
  const match = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/
  );
  if (match) {
    const [, yyyy, mm, dd, hh = "00", min = "00", ss = "00"] = match;
    if (!hasExplicitTimezone) {
      const date = new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}`);
      if (!Number.isNaN(date.getTime())) {
        return formatDateTimeIst(date);
      }
      return `${dd}-${mm}-${yyyy} ${hh}:${min}`;
    }
    const date = new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}`);
    if (!Number.isNaN(date.getTime())) {
      return formatDateTimeIst(date);
    }
    return `${dd}-${mm}-${yyyy} ${hh}:${min}`;
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return formatDateTimeIst(date);
};

const formatValueByFieldType = (value: string, field: any): string | null => {
  const fieldType =
    typeof field?.fieldType?.fieldType === "string"
      ? field.fieldType.fieldType
      : undefined;
  const inputFormatId = field.inputFormatId ?? field.input_format_id;

  if ((fieldType && DATE_FIELD_TYPES.has(fieldType)) || DATE_INPUT_FORMATS.has(inputFormatId)) {
    return formatDateOnlyValue(value);
  }
  if ((fieldType && TIME_FIELD_TYPES.has(fieldType)) || TIME_INPUT_FORMATS.has(inputFormatId)) {
    return formatTimeOnlyValue(value);
  }
  if ((fieldType && DATETIME_FIELD_TYPES.has(fieldType)) || DATETIME_INPUT_FORMATS.has(inputFormatId)) {
    return formatDateTimeValue(value);
  }
  return null;
};

const isDropdownFieldType = (field: any): boolean => {
  const fieldType =
    typeof field?.fieldType?.fieldType === "string"
      ? field.fieldType.fieldType
      : undefined;
  return fieldType ? DROPDOWN_FIELD_TYPES.has(fieldType) : false;
};

const formatDateTime = (value: Date | string | null | undefined): string | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return formatDateTimeIst(date);
};

const parseCsvIds = (value: string): string[] => {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
};

const parseValueIds = (raw: string): string[] => {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  return trimmed.includes(",") ? parseCsvIds(trimmed) : [trimmed];
};

const pickQueryValue = (
  query: Record<string, unknown>,
  keys: string[]
): string | undefined => {
  for (const key of keys) {
    const value = query[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim()) {
      return value[0].trim();
    }
  }
  return undefined;
};

const parsePositiveInt = (raw: string | undefined, fieldLabel: string): number | undefined => {
  if (raw === undefined) return undefined;
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) {
    throw new ApiError(`Invalid ${fieldLabel}`, 400);
  }
  return Math.trunc(num);
};

const parseWardBoothFilter = (raw: string | undefined, fieldLabel: string): number | undefined => {
  if (raw === undefined) return undefined;
  const num = Number(raw);
  if (!Number.isFinite(num)) {
    throw new ApiError(`Invalid ${fieldLabel}`, 400);
  }
  const normalized = Math.trunc(num);
  if (normalized === -1) return -1;
  if (normalized <= 0) {
    throw new ApiError(`Invalid ${fieldLabel}`, 400);
  }
  return normalized;
};

const parseDateValue = (raw: string, fieldLabel: string): Date => {
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(`Invalid ${fieldLabel}`, 400);
  }
  return parsed;
};

const buildDayRange = (date: Date): { from: Date; to: Date } => {
  const from = new Date(date);
  from.setHours(0, 0, 0, 0);
  const to = new Date(date);
  to.setHours(23, 59, 59, 999);
  return { from, to };
};

type QueryRecord = Record<string, unknown>;

const firstQueryValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.length > 0 ? value[0] : undefined;
  }
  return value;
};

const resolveNestedValue = (source: unknown, segments: string[]): unknown => {
  let current: unknown = source;

  for (const segment of segments) {
    if (current === undefined || current === null) {
      return undefined;
    }

    if (Array.isArray(current)) {
      current = current[0];
    }

    if (typeof current !== "object") {
      return undefined;
    }

    current = (current as QueryRecord)[segment];
  }

  return current;
};

const pickUserQueryValue = (query: QueryRecord, candidates: string[]): unknown => {
  for (const candidate of candidates) {
    if (Object.prototype.hasOwnProperty.call(query, candidate)) {
      const direct = firstQueryValue(query[candidate]);
      if (direct !== undefined) {
        return direct;
      }
    }

    const nested = resolveNestedValue(query, candidate.split("."));
    const normalized = firstQueryValue(nested);
    if (normalized !== undefined) {
      return normalized;
    }
  }

  return undefined;
};

const parseStringFilter = (value: unknown): string | undefined => {
  const normalized = firstQueryValue(value);
  if (normalized === undefined || normalized === null) {
    return undefined;
  }

  const result = String(normalized).trim();
  return result ? result : undefined;
};

const parseNumberFilter = (value: unknown): number | undefined => {
  const normalized = firstQueryValue(value);
  if (normalized === undefined || normalized === null || normalized === "") {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseBooleanFilter = (value: unknown): boolean | undefined => {
  const normalized = firstQueryValue(value);
  if (normalized === undefined || normalized === null || normalized === "") {
    return undefined;
  }

  if (typeof normalized === "boolean") {
    return normalized;
  }

  if (typeof normalized === "number") {
    if (normalized === 1) {
      return true;
    }
    if (normalized === 0) {
      return false;
    }
  }

  const normalizedStr = String(normalized).trim().toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(normalizedStr)) {
    return true;
  }
  if (["false", "0", "no", "n", "off"].includes(normalizedStr)) {
    return false;
  }
  return undefined;
};

const parseDateFilter = (value: unknown): string | undefined => {
  const normalized = parseStringFilter(value);
  if (!normalized) {
    return undefined;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return normalized;
};

const parseNumberListFilter = (value: unknown): number[] | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const rawValues = Array.isArray(value)
    ? value
    : String(value)
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);

  const numbers = rawValues
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry)) as number[];

  if (numbers.length === 0) {
    return undefined;
  }

  return Array.from(new Set(numbers));
};

const applyRangeFilter = (
  target: Record<string, unknown>,
  field: string,
  start?: string | number,
  end?: string | number
): void => {
  if (start === undefined && end === undefined) {
    return;
  }

  target[field] = {
    ...(start !== undefined ? { [Op.gte]: start } : {}),
    ...(end !== undefined ? { [Op.lte]: end } : {})
  };
};

const USER_REPORT_PROFILE_INCLUDE = [
  { association: "gender", attributes: ["id", "dispName"], required: false },
  { association: "maritalStatus", attributes: ["id", "dispName"], required: false },
  { association: "residenceType", attributes: ["id", "dispName"], required: false },
  { association: "rationCardType", attributes: ["id", "dispName"], required: false },
  { association: "familyGod", attributes: ["id", "dispName"], required: false },
  { association: "wardNumber", attributes: ["id", "dispName"], required: false },
  { association: "boothNumber", attributes: ["id", "dispName"], required: false },
  { association: "educationalDetail", attributes: ["id", "dispName"], required: false },
  { association: "educationalDetailGroup", attributes: ["id", "dispName"], required: false },
  { association: "sector", attributes: ["id", "dispName"], required: false },
  { association: "relationshipType", attributes: ["id", "dispName"], required: false },
  { association: "floor", attributes: ["id", "dispName"], required: false },
  { association: "employmentStatus", attributes: ["id", "dispName"], required: false },
  { association: "disabilityStatus", attributes: ["id", "dispName"], required: false },
  { association: "motherTongue", attributes: ["id", "dispName"], required: false },
  { association: "religion", attributes: ["id", "dispName"], required: false },
  { association: "mainCaste", attributes: ["id", "dispName"], required: false },
  { association: "subCaste", attributes: ["id", "dispName", "categoryId"], required: false },
  { association: "employmentGroup", attributes: ["id", "dispName"], required: false },
  { association: "employment", attributes: ["id", "dispName"], required: false }
];

const resolveHierarchyUserIds = async (
  user: AuthenticatedRequest["user"]
): Promise<number[] | null> => {
  if (!user?.id) return null;

  const roleIds =
    user.roleIds && user.roleIds.length > 0
      ? user.roleIds
      : await getRoleIdsByNames(user.roles ?? []);

  if (roleIds.length === 0) return null;

  const allDescendantRoleIds: Set<number> = new Set();
  for (const roleId of roleIds) {
    const descendantRoles = await getDescendantRoleIds(roleId);
    descendantRoles.forEach((id) => allDescendantRoleIds.add(id));
  }

  if (allDescendantRoleIds.size === 0) return null;

  const roleLinks = await UserRole.findAll({
    attributes: ["userId"],
    where: { roleId: { [Op.in]: Array.from(allDescendantRoleIds) }, status: 1 },
    raw: true
  });

  const userIds = new Set<number>(roleLinks.map((row: any) => Number(row.userId)));
  userIds.add(Number(user.id));

  return Array.from(userIds).filter((id) => Number.isFinite(id));
};

const resolveMetaTableOptionValue = (record: any, primaryKey: string): string | number => {
  const fallback = record?.[primaryKey];
  const valueCandidates = [
    record?.value,
    record?.targetValue,
    record?.code,
    record?.shortName,
    record?.short_name,
    record?.dispName,
    record?.title,
    fallback
  ];
  for (const candidate of valueCandidates) {
    if (candidate !== undefined && candidate !== null && candidate !== "") {
      return candidate as string | number;
    }
  }
  return fallback as string | number;
};

const resolveMetaTableOptionLabel = (record: any, optionValue: string | number) => {
  const labelCandidates = [record?.dispName, record?.title, record?.name, record?.label];
  for (const candidate of labelCandidates) {
    if (candidate !== undefined && candidate !== null && candidate !== "") {
      return String(candidate);
    }
  }
  return String(optionValue ?? "");
};

/**
 * Get form event report with details, metrics, and tabular data
 * GET /reports/form-events/:formEventId
 */
export const getFormEventReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { formEventId } = req.params;
  const queryParams = (req.query || {}) as Record<string, unknown>;

  const wardNumberRaw = pickQueryValue(queryParams, ["wardNumberId", "ward_number_id"]);
  const boothNumberRaw = pickQueryValue(queryParams, ["boothNumberId", "booth_number_id"]);
  const submittedByRaw = pickQueryValue(queryParams, [
    "submittedBy",
    "submitted_by",
    "createdBy",
    "created_by"
  ]);
  const submittedFromRaw = pickQueryValue(queryParams, ["submittedFrom", "submitted_from"]);
  const submittedToRaw = pickQueryValue(queryParams, ["submittedTo", "submitted_to"]);

  const wardNumberId = parseWardBoothFilter(wardNumberRaw, "wardNumberId");
  const boothNumberId = parseWardBoothFilter(boothNumberRaw, "boothNumberId");
  const submittedById = parsePositiveInt(submittedByRaw, "submittedBy");

  // Validate formEventId
  const formEventIdNum = Number(formEventId);
  if (!Number.isFinite(formEventIdNum) || formEventIdNum <= 0) {
    throw new ApiError("Invalid formEventId", 400);
  }

  // Check if form event exists
  const formEvent = await FormEvent.findByPk(formEventIdNum, {
    include: [
      {
        model: Form,
        as: "form",
        attributes: ["id", "title", "description", "includeUser"]
      }
    ]
  });

  if (!formEvent) {
    throw new ApiError("Form event not found", 404);
  }

  // Get form and all its fields
  const form = await Form.findByPk(formEvent.formId, {
    attributes: ["id", "title", "description", "includeUser"],
    include: [
      {
        model: FormField,
        as: "fields",
        attributes: [
          "id",
          "fieldKey",
          "label",
          "fieldTypeId",
          "inputFormatId",
          "sortOrder",
          "metaTable"
        ],
        include: [
          {
            association: "fieldType",
            attributes: ["id", "fieldType", "dispName"]
          },
          {
            model: FormFieldOption,
            as: "options",
            attributes: ["id", "fieldId", "optionLabel", "optionValue", "status"]
          }
        ],
        order: [["sortOrder", "ASC"]]
      }
    ]
  });

  if (!form) {
    throw new ApiError("Form not found", 404);
  }

  const submissionWhere: Record<string | symbol, unknown> = {
    formEventId: formEventIdNum,
    status: 1
  };

  const hierarchyUserIds = await resolveHierarchyUserIds(req.user);

  if (hierarchyUserIds && hierarchyUserIds.length > 0) {
    submissionWhere.submittedBy = { [Op.in]: hierarchyUserIds };
  }

  if (submittedById) {
    if (hierarchyUserIds && hierarchyUserIds.length > 0) {
      submissionWhere.submittedBy = hierarchyUserIds.includes(submittedById)
        ? submittedById
        : { [Op.in]: [0] };
    } else {
      submissionWhere.submittedBy = submittedById;
    }
  }

  if (submittedFromRaw || submittedToRaw) {
    const submittedAtFilter: Record<string | symbol, unknown> = {};

    if (submittedFromRaw && submittedToRaw) {
      submittedAtFilter[Op.gte] = parseDateValue(submittedFromRaw, "submittedFrom");
      submittedAtFilter[Op.lte] = parseDateValue(submittedToRaw, "submittedTo");
    } else if (submittedFromRaw) {
      const parsed = parseDateValue(submittedFromRaw, "submittedFrom");
      const { from, to } = buildDayRange(parsed);
      submittedAtFilter[Op.gte] = from;
      submittedAtFilter[Op.lte] = to;
    } else if (submittedToRaw) {
      const parsed = parseDateValue(submittedToRaw, "submittedTo");
      const { from, to } = buildDayRange(parsed);
      submittedAtFilter[Op.gte] = from;
      submittedAtFilter[Op.lte] = to;
    }

    submissionWhere.submittedAt = submittedAtFilter;
  }

  let filteredSubmissionIds: number[] | null = null;
  const applySubmissionFilter = (ids: number[]) => {
    if (filteredSubmissionIds === null) {
      filteredSubmissionIds = ids;
      return;
    }
    const idSet = new Set(filteredSubmissionIds);
    filteredSubmissionIds = ids.filter((id) => idSet.has(id));
  };

  // Get total submissions count
  const wardField = (form.fields || []).find(
    (field) => field.fieldKey === "__ward_number_id"
  );
  const boothField = (form.fields || []).find(
    (field) => field.fieldKey === "__booth_number_id"
  );

  if (wardNumberId !== undefined && wardNumberId !== -1 && wardField) {
    const wardMatches = await FormFieldValue.findAll({
      attributes: ["formSubmissionId"],
      where: { formFieldId: wardField.id, value: String(wardNumberId) },
      include: [
        {
          model: FormSubmission,
          as: "formSubmission",
          attributes: [],
          where: { formEventId: formEventIdNum, status: 1 }
        }
      ],
      raw: true
    });
    applySubmissionFilter(wardMatches.map((row: any) => Number(row.formSubmissionId)));
  }

  if (boothNumberId !== undefined && boothNumberId !== -1 && boothField) {
    const boothMatches = await FormFieldValue.findAll({
      attributes: ["formSubmissionId"],
      where: { formFieldId: boothField.id, value: String(boothNumberId) },
      include: [
        {
          model: FormSubmission,
          as: "formSubmission",
          attributes: [],
          where: { formEventId: formEventIdNum, status: 1 }
        }
      ],
      raw: true
    });
    applySubmissionFilter(boothMatches.map((row: any) => Number(row.formSubmissionId)));
  }

  if (filteredSubmissionIds !== null) {
    const submissionIds = filteredSubmissionIds as number[];
    submissionWhere.id = {
      [Op.in]: submissionIds.length > 0 ? submissionIds : [0]
    };
  }

  const totalSubmissions = await FormSubmission.count({
    where: submissionWhere
  });

  // Get all submissions with their field values
  const submissions = await FormSubmission.findAll({
    where: submissionWhere,
    include: [
      {
        model: FormFieldValue,
        as: "fieldValues",
        attributes: ["formFieldId", "fieldKey", "value"]
      },
      {
        model: User,
        as: "user",
        attributes: ["id", "email", "fullName", "contactNumber"],
        include: [
          {
            model: UserProfile,
            as: "profile",
            attributes: ["displayName"]
          }
        ]
      },
      {
        model: User,
        as: "targetUser",
        attributes: ["id", "email", "fullName", "contactNumber"],
        include: [
          {
            model: UserProfile,
            as: "profile",
            attributes: [
              "displayName",
              "fullAddress",
              "addressLine1",
              "addressLine2",
              "city",
              "stateId"
            ]
          }
        ]
      }
    ],
    attributes: ["id", "submittedBy", "userId", "submittedAt"],
    order: [["submittedAt", "DESC"]]
  });

  // Prepare headers (field names)
  const formFields = (form.fields || []).slice().sort((a, b) => {
    const aOrder = typeof (a as any).sortOrder === "number" ? (a as any).sortOrder : 0;
    const bOrder = typeof (b as any).sortOrder === "number" ? (b as any).sortOrder : 0;
    return aOrder - bOrder;
  });
  const headers = [
    "SL No.",
    ...formFields.map((f) => f.label),
    ...(form.includeUser === 1 ? SUBMITTED_USER_REPORT_FIELDS.map((field) => field.label) : []),
    "Submitted by",
    "Submitted date",
    "Actions"
  ];

  // Prepare tabular data
  type TabularCell = string | number | null | { submissionId: number };
  const tabularRows: TabularCell[][] = [];
  const numericColumns: boolean[] = [];

  // Determine which columns are numeric
  for (const field of formFields) {
    // You can enhance this by checking fieldTypeId against numeric types
    // For now, we'll try to detect based on the actual values
    numericColumns.push(false);
  }

  const optionLabelLookup = new Map<number, Map<string, string>>();
  const metaTableFieldLookup = new Map<number, string>();
  for (const field of formFields) {
    if (isDropdownFieldType(field)) {
      if ((field as any).metaTable) {
        metaTableFieldLookup.set(field.id, (field as any).metaTable);
      } else if (typeof (field as any).fieldKey === "string") {
        const fieldKey = (field as any).fieldKey;
        const metaTable = WARD_BOOTH_META_TABLES.get(fieldKey);
        if (metaTable) {
          metaTableFieldLookup.set(field.id, metaTable);
        }
      }
    }
    const options = (field as any).options || [];
    if (!Array.isArray(options) || options.length === 0) continue;
    const optionMap = new Map<string, string>();
    for (const option of options) {
      if (option?.status !== 1) continue;
      optionMap.set(String(option.id), option.optionLabel);
    }
  if (optionMap.size > 0) {
    optionLabelLookup.set(field.id, optionMap);
  }
  }

  const metaTableRecordsLookup = new Map<string, { primaryKey: string; records: Map<string, any> }>();
  if (metaTableFieldLookup.size > 0) {
    const idsByTable = new Map<string, Set<string>>();
    for (const submission of submissions) {
      if (!submission.fieldValues) continue;
      for (const fv of submission.fieldValues) {
        const tableName = metaTableFieldLookup.get(fv.formFieldId);
        if (!tableName) continue;
        const rawValue = typeof fv.value === "string" ? fv.value.trim() : "";
        if (!rawValue) continue;
        const ids = parseValueIds(rawValue);
        if (!idsByTable.has(tableName)) {
          idsByTable.set(tableName, new Set());
        }
        const set = idsByTable.get(tableName)!;
        for (const id of ids) set.add(id);
      }
    }

    await Promise.all(
      Array.from(idsByTable.entries()).map(async ([tableName, ids]) => {
        const metaTable = await getMetaTableByTableName(tableName);
        if (!metaTable) return;
        const idList = Array.from(ids);
        if (idList.length === 0) return;

        const where: any = {
          [metaTable.primaryKey]: { [Op.in]: idList }
        };
        if (metaTable.hasStatus) {
          where.status = 1;
        }

        const rows = await metaTable.model.findAll({ where });
        const rowMap = new Map<string, any>();
        for (const row of rows as any[]) {
          const data =
            row && typeof row === "object" && "dataValues" in row ? row.dataValues : row;
          const key = data?.[metaTable.primaryKey];
          if (key !== undefined && key !== null) {
            rowMap.set(String(key), data);
          }
        }
        metaTableRecordsLookup.set(tableName, {
          primaryKey: metaTable.primaryKey,
          records: rowMap
        });
      })
    );
  }

  // Build data rows from submissions
  for (let submissionIndex = 0; submissionIndex < submissions.length; submissionIndex++) {
    const submission = submissions[submissionIndex];
    const row: (string | number | null)[] = [];
    const fieldValueMap = new Map<number, string | null>();

    // Create map of fieldId -> value for quick lookup
    if (submission.fieldValues) {
      for (const fv of submission.fieldValues) {
        fieldValueMap.set(fv.formFieldId, fv.value);
      }
    }

    // Build row with values in field order
    for (let i = 0; i < formFields.length; i++) {
      const field = formFields[i];
      const value =
        fieldValueMap.has(field.id) ? fieldValueMap.get(field.id) ?? "" : "";
      const optionMap = optionLabelLookup.get(field.id);
      const metaTableName = metaTableFieldLookup.get(field.id);
      const metaTableRecords = metaTableName ? metaTableRecordsLookup.get(metaTableName) : null;

      if (value && metaTableRecords) {
        const trimmed = value.trim();
        if (trimmed.includes(",")) {
          const labels = parseCsvIds(trimmed)
            .map((entry) => metaTableRecords.records.get(entry))
            .filter(Boolean)
            .map((record) => {
              const optionValue = resolveMetaTableOptionValue(record, metaTableRecords.primaryKey);
              return resolveMetaTableOptionLabel(record, optionValue);
            });
          row.push(labels.join(", "));
          continue;
        }

        const record = metaTableRecords.records.get(trimmed);
        if (record) {
          const optionValue = resolveMetaTableOptionValue(record, metaTableRecords.primaryKey);
          row.push(resolveMetaTableOptionLabel(record, optionValue));
          continue;
        }
      }

      if (value && optionMap) {
        const trimmed = value.trim();
        if (trimmed.includes(",")) {
          const labels = trimmed
            .split(",")
            .map((entry) => entry.trim())
            .filter((entry) => entry.length > 0)
            .map((entry) => optionMap.get(entry))
            .filter((entry): entry is string => Boolean(entry));
          row.push(labels.join(", "));
          continue;
        }

        const label = optionMap.get(trimmed);
        if (label) {
          row.push(label);
          continue;
        }
      }

      if (value) {
        const formatted = formatValueByFieldType(value, field);
        if (formatted) {
          row.push(formatted);
          continue;
        }
      }

      // Try to convert to number if possible
      if (value) {
        const numValue = Number(value);
        if (!Number.isNaN(numValue)) {
          row.push(numValue);
          numericColumns[i] = true;
        } else {
          row.push(value);
        }
      } else {
        row.push("");
      }
    }

    if (form.includeUser === 1) {
      for (const field of SUBMITTED_USER_REPORT_FIELDS) {
        row.push(
          resolveSubmittedUserValue(
            {
              user: (submission as any).targetUser ?? null
            } as any,
            field.key
          )
        );
      }
    }

    const createdByLabel =
      submission.user?.profile?.displayName ||
      submission.user?.email ||
      (submission.submittedBy ? String(submission.submittedBy) : "");

    const fullRow: TabularCell[] = [
      submissionIndex + 1,
      ...row,
      createdByLabel,
      formatDateTime(submission.submittedAt),
      submission.id
    ];

    tabularRows.push(fullRow);
  }

  const [
    totalForms,
    publicRegistrationForms,
    crfRegistrationForms,
    assignedFormsCount
  ] = await Promise.all([
    Form.count(),
    Form.count({ where: { isPublic: 1 } }),
    Form.count({ where: { isPublic: { [Op.ne]: 1 } } }),
    FormEvent.count({ distinct: true, col: "formId" })
  ]);

  const notAssignedForms = Math.max(0, totalForms - assignedFormsCount);

  // Prepare metrics
  const metrics = {
    totalSubmissions,
    totalForms,
    publicRegistrationForms,
    crfRegistrationForms,
    notAssignedForms
  };

  // Prepare tabular data object
  const tabularData = {
    headers,
    data: tabularRows
  };

  // Prepare response data
  const reportData = {
    formEvent: {
      id: formEvent.id,
      title: formEvent.title,
      description: formEvent.description,
      startDate: formEvent.startDate,
      endDate: formEvent.endDate,
      status: formEvent.status,
      form: formEvent.form
    },
    metrics,
    tabularData
  };

  sendSuccess(res, reportData, "Form event report retrieved successfully");
});

/**
 * Get users report with filters (without access-control based filtering)
 * GET /reports/users
 */
export const getUsersReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  requireAuthenticatedUser(req);

  const { page, limit, offset } = parsePaginationParams(
    req.query.page as string,
    req.query.limit as string,
    25,
    100
  );

  const queryParams = req.query as QueryRecord;
  const search = parseStringFilter(pickUserQueryValue(queryParams, ["search"])) ?? "";

  const contactNumberFilter = parseStringFilter(
    pickUserQueryValue(queryParams, ["contactNumber", "contact_number"])
  );
  const userIdFilter = parseNumberFilter(pickUserQueryValue(queryParams, ["id", "userId", "user_id"]));
  const userEmailFilter = parseStringFilter(pickUserQueryValue(queryParams, ["email"]));
  const userFullNameFilter = parseStringFilter(
    pickUserQueryValue(queryParams, ["fullName", "full_name"])
  );
  const userStatusFilters = parseNumberListFilter(queryParams.status);

  const dateOfBirthStart = parseDateFilter(
    pickUserQueryValue(queryParams, ["dateOfBirthStart", "date_of_birth_start"])
  );
  const dateOfBirthEnd = parseDateFilter(
    pickUserQueryValue(queryParams, ["dateOfBirthEnd", "date_of_birth_end"])
  );
  const citizenAgeStart = parseNumberFilter(
    pickUserQueryValue(queryParams, ["citizenAgeStart", "citizen_age_start"])
  );
  const citizenAgeEnd = parseNumberFilter(
    pickUserQueryValue(queryParams, ["citizenAgeEnd", "citizen_age_end"])
  );
  const genderFilter = parseNumberFilter(pickUserQueryValue(queryParams, ["genderId", "gender_id"]));
  const maritalStatusFilter = parseNumberFilter(
    pickUserQueryValue(queryParams, ["maritalStatusId", "marital_status_id"])
  );
  const residenceTypeFilter = parseNumberFilter(
    pickUserQueryValue(queryParams, ["residenceTypeId", "residence_type_id"])
  );
  const familyGodFilter = parseNumberFilter(
    pickUserQueryValue(queryParams, ["familyGodId", "family_god_id"])
  );
  const nativePlaceFilter = parseStringFilter(
    pickUserQueryValue(queryParams, ["nativePlace", "native_place"])
  );
  const relationshipTypeFilter = parseNumberFilter(
    pickUserQueryValue(queryParams, ["relationshipTypeId", "relationship_type_id"])
  );
  const floorFilter = parseNumberFilter(pickUserQueryValue(queryParams, ["floorId", "floor_id"]));
  const occupationFilter = parseStringFilter(pickUserQueryValue(queryParams, ["occupation"]));
  const cityFilter = parseStringFilter(pickUserQueryValue(queryParams, ["city"]));
  const stateIdFilter = parseNumberFilter(pickUserQueryValue(queryParams, ["stateId", "state_id"]));
  const mpConstituencyFilter = parseNumberFilter(
    pickUserQueryValue(queryParams, ["mpConstituencyId", "mp_constituency_id", "mpcontituencyId"])
  );
  const mlaConstituencyFilter = parseNumberFilter(
    pickUserQueryValue(queryParams, ["mlaConstituencyId", "mla_constituency_id", "mlacontituencyId"])
  );
  const governingBodyFilter = parseStringFilter(
    pickUserQueryValue(queryParams, ["governingBody", "governing_body"])
  );
  const gramPanchayatFilter = parseNumberFilter(
    pickUserQueryValue(queryParams, ["gramPanchayatId", "gram_panchayat_id", "grampanchayatId"])
  );
  const mainVillageFilter = parseNumberFilter(
    pickUserQueryValue(queryParams, ["mainVillageId", "main_village_id"])
  );
  const postalCodeFilter = parseStringFilter(
    pickUserQueryValue(queryParams, ["postalCode", "postal_code"])
  );
  const wardNumberFilter = parseNumberFilter(
    pickUserQueryValue(queryParams, ["wardNumberId", "ward_number_id"])
  );
  const boothNumberFilter = parseNumberFilter(
    pickUserQueryValue(queryParams, ["boothNumberId", "booth_number_id"])
  );
  const sectorFilter = parseNumberFilter(pickUserQueryValue(queryParams, ["sectorId", "sector_id"]));
  const postsBlockedFilter = parseBooleanFilter(
    pickUserQueryValue(queryParams, ["postsBlocked", "posts_blocked"])
  );
  const referredByFilter = parseStringFilter(
    pickUserQueryValue(queryParams, ["referredBy", "referred_by"])
  );
  const educationalDetailFilter = parseNumberFilter(
    pickUserQueryValue(queryParams, ["educationalDetailId", "educational_detail_id"])
  );
  const educationalDetailGroupFilter = parseNumberFilter(
    pickUserQueryValue(queryParams, ["educationalDetailGroupId", "educational_detail_group_id"])
  );
  const disabilityStatusFilter = parseNumberFilter(
    pickUserQueryValue(queryParams, ["disabilityStatusId", "disability_status_id"])
  );
  const motherTongueFilter = parseNumberFilter(
    pickUserQueryValue(queryParams, ["motherTongueId", "mother_tongue_id"])
  );
  const religionFilter = parseNumberFilter(pickUserQueryValue(queryParams, ["religionId", "religion_id"]));
  const mainCasteFilter = parseNumberFilter(
    pickUserQueryValue(queryParams, ["mainCasteId", "main_caste_id"])
  );
  const subCasteFilter = parseNumberFilter(
    pickUserQueryValue(queryParams, ["subCasteId", "sub_caste_id"])
  );
  const employmentGroupFilter = parseNumberFilter(
    pickUserQueryValue(queryParams, ["employmentGroupId", "employment_group_id"])
  );
  const employmentFilter = parseNumberFilter(
    pickUserQueryValue(queryParams, ["employmentId", "employmentTypeId", "employment_type_id"])
  );
  const voterIdNumberFilter = parseStringFilter(
    pickUserQueryValue(queryParams, ["voterIdNumber", "voter_id_number"])
  );
  const rationCardNoFilter = parseStringFilter(
    pickUserQueryValue(queryParams, ["rationCardNo", "ration_card_no"])
  );
  const dateOfJoiningStart = parseDateFilter(
    pickUserQueryValue(queryParams, ["dateOfJoiningStart", "date_of_joining_start"])
  );
  const dateOfJoiningEnd = parseDateFilter(
    pickUserQueryValue(queryParams, ["dateOfJoiningEnd", "date_of_joining_end"])
  );
  const doorNumberFilter = parseStringFilter(
    pickUserQueryValue(queryParams, ["doorNumber", "door_number"])
  );
  const serviceConservancyRoadFilter = parseStringFilter(
    pickUserQueryValue(queryParams, ["serviceConservancyRoad", "service_conservancy_road"])
  );
  const mainRoadFilter = parseStringFilter(pickUserQueryValue(queryParams, ["mainRoad", "main_road"]));
  const crossRoadFilter = parseStringFilter(
    pickUserQueryValue(queryParams, ["crossRoad", "cross_road"])
  );
  const locationAreaFilter = parseStringFilter(
    pickUserQueryValue(queryParams, ["locationArea", "location_area"])
  );
  const landmarkFilter = parseStringFilter(pickUserQueryValue(queryParams, ["landmark"]));

  let roleIds: number[] | undefined;
  const roleIdInput = req.query.roleId;
  if (roleIdInput) {
    try {
      const parsedIds = parseRoleIdsInput(roleIdInput);
      roleIds = parsedIds ?? undefined;
    } catch (error) {
      const singleId = Number(roleIdInput);
      if (!Number.isNaN(singleId) && singleId > 0) {
        roleIds = [singleId];
      }
    }
  }

  const userFilters: Record<string, unknown> = {};
  if (userIdFilter !== undefined) {
    userFilters.id = userIdFilter;
  }
  if (contactNumberFilter) {
    userFilters.contactNumber = contactNumberFilter;
  }
  if (userEmailFilter) {
    userFilters.email = { [Op.like]: `%${userEmailFilter}%` };
  }
  if (userFullNameFilter) {
    userFilters.fullName = { [Op.like]: `%${userFullNameFilter}%` };
  }
  if (userStatusFilters && userStatusFilters.length > 0) {
    userFilters.status =
      userStatusFilters.length === 1 ? userStatusFilters[0] : { [Op.in]: userStatusFilters };
  }

  const profileFilters: Record<string, unknown> = {};
  applyRangeFilter(profileFilters, "dateOfBirth", dateOfBirthStart, dateOfBirthEnd);
  applyRangeFilter(profileFilters, "citizenAge", citizenAgeStart, citizenAgeEnd);
  applyRangeFilter(profileFilters, "dateOfJoining", dateOfJoiningStart, dateOfJoiningEnd);

  if (genderFilter !== undefined) profileFilters.genderId = genderFilter;
  if (maritalStatusFilter !== undefined) profileFilters.maritalStatusId = maritalStatusFilter;
  if (residenceTypeFilter !== undefined) profileFilters.residenceTypeId = residenceTypeFilter;
  if (familyGodFilter !== undefined) profileFilters.familyGodId = familyGodFilter;
  if (nativePlaceFilter) profileFilters.nativePlace = { [Op.like]: `%${nativePlaceFilter}%` };
  if (relationshipTypeFilter !== undefined) profileFilters.relationshipTypeId = relationshipTypeFilter;
  if (floorFilter !== undefined) profileFilters.floorId = floorFilter;
  if (occupationFilter) profileFilters.occupation = { [Op.like]: `%${occupationFilter}%` };
  if (cityFilter) profileFilters.city = { [Op.like]: `%${cityFilter}%` };
  if (stateIdFilter !== undefined) profileFilters.stateId = stateIdFilter;
  if (mpConstituencyFilter !== undefined) profileFilters.mpConstituencyId = mpConstituencyFilter;
  if (mlaConstituencyFilter !== undefined) profileFilters.mlaConstituencyId = mlaConstituencyFilter;
  if (governingBodyFilter) profileFilters.governingBody = governingBodyFilter.toUpperCase();
  if (gramPanchayatFilter !== undefined) profileFilters.gramPanchayatId = gramPanchayatFilter;
  if (mainVillageFilter !== undefined) profileFilters.mainVillageId = mainVillageFilter;
  if (postalCodeFilter) profileFilters.postalCode = { [Op.like]: `%${postalCodeFilter}%` };
  if (wardNumberFilter !== undefined) profileFilters.wardNumberId = wardNumberFilter;
  if (boothNumberFilter !== undefined) profileFilters.boothNumberId = boothNumberFilter;
  if (sectorFilter !== undefined) profileFilters.sectorId = sectorFilter;
  if (postsBlockedFilter !== undefined) profileFilters.postsBlocked = postsBlockedFilter;
  if (referredByFilter) profileFilters.referredBy = { [Op.like]: `%${referredByFilter}%` };
  if (educationalDetailFilter !== undefined) profileFilters.educationalDetailId = educationalDetailFilter;
  if (educationalDetailGroupFilter !== undefined) {
    profileFilters.educationalDetailGroupId = educationalDetailGroupFilter;
  }
  if (disabilityStatusFilter !== undefined) profileFilters.disabilityStatusId = disabilityStatusFilter;
  if (motherTongueFilter !== undefined) profileFilters.motherTongueId = motherTongueFilter;
  if (religionFilter !== undefined) profileFilters.religionId = religionFilter;
  if (mainCasteFilter !== undefined) profileFilters.mainCasteId = mainCasteFilter;
  if (subCasteFilter !== undefined) profileFilters.subCasteId = subCasteFilter;
  if (employmentGroupFilter !== undefined) profileFilters.employmentGroupId = employmentGroupFilter;
  if (employmentFilter !== undefined) profileFilters.employmentTypeId = employmentFilter;
  if (voterIdNumberFilter) profileFilters.voterIdNumber = { [Op.like]: `%${voterIdNumberFilter}%` };
  if (rationCardNoFilter) profileFilters.rationCardNo = { [Op.like]: `%${rationCardNoFilter}%` };
  if (doorNumberFilter) profileFilters.doorNumber = { [Op.like]: `%${doorNumberFilter}%` };
  if (serviceConservancyRoadFilter) {
    profileFilters.serviceConservancyRoad = { [Op.like]: `%${serviceConservancyRoadFilter}%` };
  }
  if (mainRoadFilter) profileFilters.mainRoad = { [Op.like]: `%${mainRoadFilter}%` };
  if (crossRoadFilter) profileFilters.crossRoad = { [Op.like]: `%${crossRoadFilter}%` };
  if (locationAreaFilter) profileFilters.locationArea = { [Op.like]: `%${locationAreaFilter}%` };
  if (landmarkFilter) profileFilters.landmark = { [Op.like]: `%${landmarkFilter}%` };

  const profileFiltersApplied = Object.keys(profileFilters).length > 0;

  const whereClauses: Record<string, unknown>[] = [{ status: { [Op.gt]: -1 } }];
  if (Object.keys(userFilters).length > 0) {
    whereClauses.push(userFilters);
  }
  if (search) {
    whereClauses.push({
      [Op.or]: [
        { contactNumber: { [Op.like]: `%${search}%` } },
        { fullName: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ]
    });
  }

  const userWhere =
    whereClauses.length > 1 ? { [Op.and]: whereClauses } : (whereClauses[0] ?? undefined);

  const { rows, count } = await User.findAndCountAll({
    where: userWhere,
    include: [
      {
        model: UserProfile,
        as: "profile",
        ...(profileFiltersApplied && { where: profileFilters, required: true }),
        include: USER_REPORT_PROFILE_INCLUDE
      },
      {
        model: UserAccess,
        as: "accessProfiles",
        where: { status: 1 },
        required: false,
        include: [
          { association: "accessRole" },
          { association: "wardNumber" },
          { association: "boothNumber" },
          { association: "mlaConstituency" }
        ]
      },
      {
        association: "roles",
        include: [{ association: "permissions" }],
        ...(roleIds && roleIds.length > 0 && { where: { id: { [Op.in]: roleIds } }, required: true })
      }
    ],
    limit,
    offset,
    order: [["createdAt", "DESC"]],
    distinct: true
  });

  const enrichedRows = await Promise.all(
    rows.map(async (user) => {
      if (user.roles && user.roles.length > 0) {
        const enrichedRoles = await enrichAdminRolePermissions(user.roles);
        return {
          ...user.toJSON(),
          roles: enrichedRoles.reverse()
        };
      }
      return user;
    })
  );

  const pagination = calculatePagination(count, page, limit);
  return sendSuccessWithPagination(
    res,
    enrichedRows,
    pagination,
    "Users report retrieved successfully"
  );
});

/**
 * Get global form event metrics (no formEventId required)
 * GET /reports/form-events/metrics
 */
export const getFormEventMetrics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const submissionWhere: Record<string | symbol, unknown> = { status: 1 };

  const hierarchyUserIds = await resolveHierarchyUserIds(req.user);
  if (hierarchyUserIds && hierarchyUserIds.length > 0) {
    submissionWhere.submittedBy = { [Op.in]: hierarchyUserIds };
  }

  const [
    totalSubmissions,
    totalForms,
    publicRegistrationForms,
    crfRegistrationForms,
    assignedFormsCount
  ] = await Promise.all([
    FormSubmission.count({ where: submissionWhere }),
    Form.count(),
    Form.count({ where: { isPublic: 1 } }),
    Form.count({ where: { isPublic: { [Op.ne]: 1 } } }),
    FormEvent.count({ distinct: true, col: "formId" })
  ]);

  const notAssignedForms = Math.max(0, totalForms - assignedFormsCount);

  const metrics = {
    totalSubmissions,
    totalForms,
    publicRegistrationForms,
    crfRegistrationForms,
    notAssignedForms
  };

  sendSuccess(res, { metrics }, "Form event metrics retrieved successfully");
});

export default { getFormEventReport, getFormEventMetrics, getUsersReport };
