import type { Response } from "express";
import { Op } from "sequelize";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { ApiError } from "../middlewares/errorHandler";
import asyncHandler from "../utils/asyncHandler";
import { sendSuccess } from "../utils/apiResponse";
import FormEvent from "../models/FormEvent";
import FormSubmission from "../models/FormSubmission";
import FormFieldValue from "../models/FormFieldValue";
import Form from "../models/Form";
import FormField from "../models/FormField";
import FormFieldOption from "../models/FormFieldOption";
import UserRole from "../models/UserRole";
import User from "../models/User";
import UserProfile from "../models/UserProfile";
import { getMetaTableByTableName } from "../utils/metaTableRegistry";
import { getDescendantRoleIds } from "../services/userHierarchyService";

const DATE_FIELD_TYPES = new Set(["date"]);
const TIME_FIELD_TYPES = new Set(["time"]);
const DATETIME_FIELD_TYPES = new Set(["datetime"]);
const DATE_INPUT_FORMATS = new Set([7]);
const TIME_INPUT_FORMATS = new Set([8]);
const DATETIME_INPUT_FORMATS = new Set([9]);
const WARD_BOOTH_FIELD_KEYS = new Set(["__ward_number_id", "__booth_number_id"]);
const WARD_BOOTH_META_TABLES = new Map<string, string>([
  ["__ward_number_id", "tbl_meta_ward_number"],
  ["__booth_number_id", "tbl_meta_booth_number"]
]);

const pad2 = (num: number) => String(num).padStart(2, "0");

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
  const match = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/
  );
  if (match) {
    const [, yyyy, mm, dd, hh = "00", min = "00", ss = "00"] = match;
    return `${dd}-${mm}-${yyyy} ${hh}:${min}:${ss}`;
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return `${pad2(date.getDate())}-${pad2(date.getMonth() + 1)}-${date.getFullYear()} ${pad2(
    date.getHours()
  )}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
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

const formatDateTime = (value: Date | string | null | undefined): string | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const dd = pad2(date.getDate());
  const mm = pad2(date.getMonth() + 1);
  const yyyy = date.getFullYear();
  const hh = pad2(date.getHours());
  const min = pad2(date.getMinutes());
  const ss = pad2(date.getSeconds());
  return `${dd}-${mm}-${yyyy} ${hh}:${min}:${ss}`;
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

const resolveHierarchyUserIds = async (
  user: AuthenticatedRequest["user"]
): Promise<number[] | null> => {
  if (!user?.id || !user.roles || user.roles.length === 0) return null;

  const allDescendantRoleIds: Set<number> = new Set();
  for (const roleIdStr of user.roles) {
    const roleId = parseInt(roleIdStr, 10);
    if (!Number.isFinite(roleId)) continue;
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
        attributes: ["id", "title", "description"]
      }
    ]
  });

  if (!formEvent) {
    throw new ApiError("Form event not found", 404);
  }

  // Get form and all its fields
  const form = await Form.findByPk(formEvent.formId, {
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
        attributes: ["id", "email"],
        include: [
          {
            model: UserProfile,
            as: "profile",
            attributes: ["displayName"]
          }
        ]
      }
    ],
    attributes: ["id", "submittedBy", "submittedAt"],
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
    if ((field as any).metaTable) {
      metaTableFieldLookup.set(field.id, (field as any).metaTable);
    } else if (typeof (field as any).fieldKey === "string") {
      const fieldKey = (field as any).fieldKey;
      const metaTable = WARD_BOOTH_META_TABLES.get(fieldKey);
      if (metaTable) {
        metaTableFieldLookup.set(field.id, metaTable);
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

  // Prepare metrics
  const metrics = {
    totalSubmissions
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

export default { getFormEventReport };
