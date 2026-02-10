import type { Request, Response } from "express";
import { Op, Transaction } from "sequelize";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { ApiError } from "../middlewares/errorHandler";
import asyncHandler from "../utils/asyncHandler";
import {
  sendCreated,
  sendSuccess,
  sendSuccessWithPagination,
  sendNotFound,
  parsePaginationParams,
  parseStatusFilter,
  parseSortDirection,
  validateSortColumn
} from "../utils/apiResponse";
import { assertNoRestrictedFields } from "../utils/payloadValidation";
import { ensureDirectory } from "../utils/fileStorage";
import sequelize from "../config/database";
import FormSubmission from "../models/FormSubmission";
import FormFieldValue from "../models/FormFieldValue";
import FormEvent from "../models/FormEvent";
import Form from "../models/Form";
import FormField from "../models/FormField";
import FormFieldOption from "../models/FormFieldOption";
import MetaFieldType from "../models/MetaFieldType";
import User from "../models/User";
import UserProfile from "../models/UserProfile";
import { UPLOAD_PATHS } from "../config/uploadConstants";
import { buildPublicUploadPath } from "../middlewares/uploadMiddleware";
import { getMetaTableByTableName } from "../utils/metaTableRegistry";

const DEFAULT_SORT_COLUMNS = ["submittedAt", "createdAt", "id"];

type ResolvedOption = {
  id: number;
  fieldId: number;
  optionLabel: string;
  optionValue: string;
};

type MetaTableRecord = Record<string, any>;
type MetaTableResolvedLookup = Map<
  string,
  {
    primaryKey: string;
    records: Map<string, MetaTableRecord>;
  }
>;

const DATE_FIELD_TYPES = new Set(["date"]);
const TIME_FIELD_TYPES = new Set(["time"]);
const DATETIME_FIELD_TYPES = new Set(["datetime"]);
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

const formatValueByFieldType = (value: string, fieldType?: string): string | null => {
  if (!fieldType) return null;
  if (DATE_FIELD_TYPES.has(fieldType)) return formatDateOnlyValue(value);
  if (TIME_FIELD_TYPES.has(fieldType)) return formatTimeOnlyValue(value);
  if (DATETIME_FIELD_TYPES.has(fieldType)) return formatDateTimeValue(value);
  return null;
};

const buildFieldTypeLookup = async (fieldIds: number[]) => {
  if (fieldIds.length === 0) return new Map<number, string>();

  const fields = await FormField.findAll({
    attributes: ["id"],
    where: { id: { [Op.in]: fieldIds } },
    include: [
      {
        model: MetaFieldType,
        as: "fieldType",
        attributes: ["fieldType"]
      }
    ]
  });

  const lookup = new Map<number, string>();
  for (const field of fields) {
    const type = (field as any).fieldType?.fieldType;
    if (typeof type === "string") {
      lookup.set(field.id, type);
    }
  }
  return lookup;
};

const buildFieldKeyLookup = async (fieldIds: number[]) => {
  if (fieldIds.length === 0) return new Map<number, string>();

  const fields = await FormField.findAll({
    attributes: ["id", "fieldKey"],
    where: { id: { [Op.in]: fieldIds } }
  });

  const lookup = new Map<number, string>();
  for (const field of fields) {
    const key = (field as any).fieldKey;
    if (typeof key === "string") {
      lookup.set(field.id, key);
    }
  }
  return lookup;
};

const looksLikeFilePayload = (value: unknown): boolean => {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  const hasPath =
    typeof record.uri === "string" ||
    typeof record.url === "string" ||
    typeof record.path === "string";
  const hasType =
    typeof record.type === "string" ||
    typeof record.mime === "string" ||
    typeof record.mimeType === "string";
  const hasName = typeof record.name === "string";
  return (hasPath && hasType) || (hasPath && hasName);
};

const buildFieldValuesFromBody = (body: Record<string, unknown>) => {
  const fieldValues: { formFieldId: number; value: unknown }[] = [];

  for (const [key, rawValue] of Object.entries(body || {})) {
    const fieldId = Number(key);
    if (!Number.isFinite(fieldId) || fieldId <= 0) continue;

    if (Array.isArray(rawValue)) {
      if (rawValue.length === 1) {
        fieldValues.push({ formFieldId: fieldId, value: rawValue[0] });
      } else if (rawValue.length > 1) {
        fieldValues.push({ formFieldId: fieldId, value: rawValue.join(",") });
      }
      continue;
    }

    fieldValues.push({ formFieldId: fieldId, value: rawValue });
  }

  return fieldValues;
};

const mapFilesByFieldId = (uploadedFiles: Express.Multer.File[]) => {
  const filesByFieldId = new Map<number, Express.Multer.File[]>();
  for (const file of uploadedFiles) {
    const fieldId = Number(file.fieldname);
    if (!Number.isFinite(fieldId) || fieldId <= 0) continue;
    if (!filesByFieldId.has(fieldId)) {
      filesByFieldId.set(fieldId, []);
    }
    filesByFieldId.get(fieldId)!.push(file);
  }
  return filesByFieldId;
};

const parseJsonFileValue = (value: string): unknown => {
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return value;

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) return parsed;
      return parsed.every((entry) => looksLikeFilePayload(entry)) ? parsed : value;
    }
    return looksLikeFilePayload(parsed) ? parsed : value;
  } catch (error) {
    return value;
  }
};

const normalizeFieldValue = (rawValue: unknown): string | null => {
  if (rawValue === undefined || rawValue === null) return null;
  if (typeof rawValue === "string") return rawValue.trim();
  if (typeof rawValue === "object") {
    try {
      return JSON.stringify(rawValue);
    } catch (error) {
      throw new ApiError("fieldValues contains a circular structure", 400);
    }
  }
  return String(rawValue);
};

const normalizeWardBoothValue = (rawValue: unknown): string | null => {
  if (rawValue === undefined || rawValue === null) return null;
  const trimmed = String(rawValue).trim();
  if (!trimmed) return null;
  const ids = parseValueIds(trimmed);
  if (ids.length === 0) return null;
  if (ids.length > 1) {
    throw new ApiError("Ward/Booth field must be a single value", 400);
  }
  const num = Number(ids[0]);
  if (!Number.isFinite(num)) {
    throw new ApiError("Ward/Booth field must be a number", 400);
  }
  return String(num);
};

const ensureMetaTableValuesExist = async (
  metaTableName: string,
  ids: string[],
  fieldLabel: string
): Promise<void> => {
  if (ids.length === 0) return;
  const metaTable = await getMetaTableByTableName(metaTableName);
  if (!metaTable) {
    throw new ApiError(`Invalid metaTable for "${fieldLabel}"`, 400);
  }

  const where: any = {
    [metaTable.primaryKey]: { [Op.in]: ids }
  };
  if (metaTable.hasStatus) {
    where.status = 1;
  }

  const rows = await metaTable.model.findAll({ where });
  const foundIds = new Set(
    (rows as any[]).map((row) => {
      const data =
        row && typeof row === "object" && "dataValues" in row ? row.dataValues : row;
      return String(data?.[metaTable.primaryKey]);
    })
  );

  const missing = ids.filter((id) => !foundIds.has(id));
  if (missing.length > 0) {
    throw new ApiError(`Invalid selection for "${fieldLabel}"`, 400);
  }
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

const buildOptionLookup = async (fieldIds: number[]) => {
  if (fieldIds.length === 0) return new Map<number, Map<string, ResolvedOption>>();

  const options = await FormFieldOption.findAll({
    attributes: ["id", "fieldId", "optionLabel", "optionValue", "status"],
    where: {
      fieldId: { [Op.in]: fieldIds },
      status: 1
    }
  });

  const optionLookup = new Map<number, Map<string, ResolvedOption>>();
  for (const option of options) {
    const fieldId = option.fieldId;
    if (!optionLookup.has(fieldId)) {
      optionLookup.set(fieldId, new Map());
    }
    optionLookup
      .get(fieldId)!
      .set(String(option.id), {
        id: option.id,
        fieldId: option.fieldId,
        optionLabel: option.optionLabel,
        optionValue: option.optionValue
      });
  }

  return optionLookup;
};

const buildMetaTableFieldLookup = async (fieldIds: number[]) => {
  const lookup = new Map<number, string>();
  if (fieldIds.length === 0) return lookup;

  const fields = await FormField.findAll({
    attributes: ["id", "metaTable", "fieldKey"],
    where: { id: { [Op.in]: fieldIds }, metaTable: { [Op.ne]: null } }
  });

  for (const field of fields) {
    const metaTable = (field as any).metaTable;
    if (typeof metaTable === "string" && metaTable.trim()) {
      lookup.set(field.id, metaTable);
    }
  }

  if (lookup.size < fieldIds.length) {
    const keyFields = await FormField.findAll({
      attributes: ["id", "fieldKey"],
      where: { id: { [Op.in]: fieldIds } }
    });
    for (const field of keyFields) {
      if (lookup.has(field.id)) continue;
      const fieldKey = (field as any).fieldKey;
      if (typeof fieldKey !== "string") continue;
      const metaTable = WARD_BOOTH_META_TABLES.get(fieldKey);
      if (metaTable) {
        lookup.set(field.id, metaTable);
      }
    }
  }

  return lookup;
};

const buildMetaTableValueLookup = async (
  fieldValues: any[],
  fieldMetaTableLookup: Map<number, string>
): Promise<MetaTableResolvedLookup> => {
  const tableIdsMap = new Map<string, Set<string>>();

  for (const fv of fieldValues) {
    const tableName = fieldMetaTableLookup.get(fv.formFieldId);
    if (!tableName) continue;
    if (typeof fv.value !== "string") continue;
    for (const id of parseValueIds(fv.value)) {
      if (!tableIdsMap.has(tableName)) {
        tableIdsMap.set(tableName, new Set());
      }
      tableIdsMap.get(tableName)!.add(id);
    }
  }

  const lookup: MetaTableResolvedLookup = new Map();

  await Promise.all(
    Array.from(tableIdsMap.entries()).map(async ([tableName, ids]) => {
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
      const rowMap = new Map<string, MetaTableRecord>();
      for (const row of rows as any[]) {
        const data =
          row && typeof row === "object" && "dataValues" in row ? row.dataValues : row;
        const key = data?.[metaTable.primaryKey];
        if (key !== undefined && key !== null) {
          rowMap.set(String(key), data as MetaTableRecord);
        }
      }
      lookup.set(tableName, { primaryKey: metaTable.primaryKey, records: rowMap });
    })
  );

  return lookup;
};

const resolveMetaTableOptionValue = (record: MetaTableRecord, primaryKey: string): string | number => {
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

const resolveMetaTableOptionLabel = (record: MetaTableRecord, optionValue: string | number) => {
  const labelCandidates = [record?.dispName, record?.title, record?.name, record?.label];
  for (const candidate of labelCandidates) {
    if (candidate !== undefined && candidate !== null && candidate !== "") {
      return String(candidate);
    }
  }
  return String(optionValue ?? "");
};

const attachResolvedOptions = (
  fieldValues: any[],
  optionLookup: Map<number, Map<string, ResolvedOption>>,
  fieldTypeLookup: Map<number, string>,
  fieldKeyLookup: Map<number, string>,
  fieldMetaTableLookup: Map<number, string>,
  metaTableValueLookup: MetaTableResolvedLookup
) => {
  for (const fv of fieldValues) {
    if (typeof fv.value === "string") {
      const decoded = parseJsonFileValue(fv.value);
      if (decoded !== fv.value) {
        const target = fv.dataValues ?? fv;
        target.value = decoded;
      }
    }

    const fieldId = fv.formFieldId;
    const fieldType = fieldTypeLookup.get(fieldId);
    if (fieldType && typeof fv.value === "string") {
      const formatted = formatValueByFieldType(fv.value, fieldType);
      if (formatted) {
        const target = fv.dataValues ?? fv;
        target.value = formatted;
      }
    }

    const optionsForField = optionLookup.get(fieldId);
    const rawValue = typeof fv.value === "string" ? fv.value.trim() : "";
    const target = fv.dataValues ?? fv;

    if (!rawValue) {
      target.resolved = null;
      continue;
    }

    const fieldKey = fieldKeyLookup.get(fieldId);
    const metaTableName = fieldMetaTableLookup.get(fieldId);
    if (metaTableName) {
      const metaEntry = metaTableValueLookup.get(metaTableName);
      if (metaEntry) {
        const { primaryKey, records } = metaEntry;
        if (rawValue.includes(",")) {
          const ids = parseCsvIds(rawValue);
          const resolved = ids
            .map((id) => {
              const record = records.get(id);
              if (!record) return null;
              const optionValue = WARD_BOOTH_FIELD_KEYS.has(fieldKey ?? "")
                ? record?.[primaryKey]
                : resolveMetaTableOptionValue(record, primaryKey);
              return {
                id: record?.[primaryKey],
                fieldId,
                optionLabel: resolveMetaTableOptionLabel(record, optionValue),
                optionValue
              };
            })
            .filter(Boolean);
          target.resolved = resolved;
        } else {
          const record = records.get(rawValue);
          if (!record) {
            target.resolved = null;
          } else {
            const optionValue = WARD_BOOTH_FIELD_KEYS.has(fieldKey ?? "")
              ? record?.[primaryKey]
              : resolveMetaTableOptionValue(record, primaryKey);
            target.resolved = {
              id: record?.[primaryKey],
              fieldId,
              optionLabel: resolveMetaTableOptionLabel(record, optionValue),
              optionValue
            };
          }
        }
        continue;
      }
    }

    if (!optionsForField) continue;

    if (rawValue.includes(",")) {
      const ids = parseCsvIds(rawValue);
      const resolved = ids
        .map((id) => optionsForField.get(id))
        .filter((entry): entry is ResolvedOption => Boolean(entry));
      target.resolved = resolved;
    } else {
      const resolved = optionsForField.get(rawValue) || null;
      target.resolved = resolved;
    }
  }
};

const resolveFieldValuesForSubmissions = async (submissions: any[] | any) => {
  const submissionList = Array.isArray(submissions) ? submissions : [submissions];
  const allFieldValues: any[] = [];
  const fieldIds = new Set<number>();

  for (const submission of submissionList) {
    const fieldValues = submission?.fieldValues || [];
    if (!Array.isArray(fieldValues)) continue;
    for (const fv of fieldValues) {
      if (fv?.formFieldId) {
        fieldIds.add(fv.formFieldId);
      }
    }
    allFieldValues.push(...fieldValues);
  }

  if (fieldIds.size === 0 || allFieldValues.length === 0) return;

  const optionLookup = await buildOptionLookup(Array.from(fieldIds));
  const fieldTypeLookup = await buildFieldTypeLookup(Array.from(fieldIds));
  const fieldKeyLookup = await buildFieldKeyLookup(Array.from(fieldIds));
  const fieldMetaTableLookup = await buildMetaTableFieldLookup(Array.from(fieldIds));
  const metaTableValueLookup = await buildMetaTableValueLookup(
    allFieldValues,
    fieldMetaTableLookup
  );
  attachResolvedOptions(
    allFieldValues,
    optionLookup,
    fieldTypeLookup,
    fieldKeyLookup,
    fieldMetaTableLookup,
    metaTableValueLookup
  );
};

/**
 * Submit a form for a specific form event
 */
export const submitForm = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { formEventId } = req.params;
  const fieldValuesFromBody = buildFieldValuesFromBody(req.body as Record<string, unknown>);
  const userId = req.user?.id;
  const uploadedFiles = Array.isArray((req as any).files)
    ? ((req as any).files as Express.Multer.File[])
    : [];

  if (!userId) {
    throw new ApiError("Unauthorized", 401);
  }

  const formEventIdNum = Number(formEventId);
  if (!Number.isFinite(formEventIdNum) || formEventIdNum <= 0) {
    throw new ApiError("Invalid formEventId", 400);
  }

  if (fieldValuesFromBody.length === 0 && uploadedFiles.length === 0) {
    throw new ApiError("Form data must include at least one field value", 400);
  }

  // Start transaction
  const transaction = await sequelize.transaction();

  try {
    // Check if form event exists and is active
    const formEvent = await FormEvent.findByPk(formEventIdNum, {
      include: [
        {
          model: Form,
          as: "form",
          include: [
            {
              model: FormField,
              as: "fields"
            }
          ]
        }
      ],
      transaction
    });

    if (!formEvent) {
      throw new ApiError("Form event not found", 404);
    }

    if (formEvent.status !== 1) {
      throw new ApiError("Form event is not active", 400);
    }

    // Check dates
    const today = new Date();
    const startDate = new Date(formEvent.startDate);
    const endDate = formEvent.endDate ? new Date(formEvent.endDate) : null;

    if (today < startDate) {
      throw new ApiError("Form submission has not started yet", 400);
    }

    if (endDate && today > endDate) {
      throw new ApiError("Form submission has ended", 400);
    }

    // Get form and fields for validation
    const form = formEvent.form;
    if (!form) {
      throw new ApiError("Form not found", 404);
    }

    const formFields = form.fields || [];
    const fieldMap = new Map(formFields.map((f) => [f.id, f]));

    const filesByFieldId = mapFilesByFieldId(uploadedFiles);
    const fieldValues = [...fieldValuesFromBody];

    for (const fieldId of filesByFieldId.keys()) {
      if (!fieldValues.some((fv) => fv.formFieldId === fieldId)) {
        fieldValues.push({ formFieldId: fieldId, value: "" });
      }
    }

    // Validate files per field (max 5 files per field)
    for (const [fieldId, files] of filesByFieldId) {
      if (files.length > 5) {
        throw new ApiError(`Field "${fieldId}" can have at most 5 files`, 400);
      }
    }

    // Validate each submitted field value
    for (const fv of fieldValues) {
      const field = fieldMap.get(fv.formFieldId);

      // Check field belongs to form
      if (!field) {
        throw new ApiError(`Field ID ${fv.formFieldId} does not belong to this form`, 400);
      }

      const value = fv.value ? String(fv.value).trim() : "";

      // Check required
      if (field.isRequired === 1 && !value && !filesByFieldId.has(fv.formFieldId)) {
        throw new ApiError(`Field "${field.label}" is required`, 400);
      }

      // Skip other validations if field is empty and optional
      if (!value && !filesByFieldId.has(fv.formFieldId)) continue;

      // Check min length
      if (field.minLength && value.length < field.minLength) {
        throw new ApiError(`"${field.label}" must be at least ${field.minLength} characters`, 400);
      }

      // Check max length
      if (field.maxLength && value.length > field.maxLength) {
        throw new ApiError(`"${field.label}" must not exceed ${field.maxLength} characters`, 400);
      }

      // Check regex pattern
      if (field.validationRegex && value) {
        const regex = new RegExp(field.validationRegex);
        if (!regex.test(value)) {
          throw new ApiError(`"${field.label}" format is invalid`, 400);
        }
      }

      // Check min/max value for numbers
      if (value) {
        const num = Number(value);
        if (!Number.isNaN(num)) {
          if (field.minValue && num < Number(field.minValue)) {
            throw new ApiError(`"${field.label}" must be at least ${field.minValue}`, 400);
          }
          if (field.maxValue && num > Number(field.maxValue)) {
            throw new ApiError(`"${field.label}" must not exceed ${field.maxValue}`, 400);
          }
        }
      }

      if (field.metaTable && value) {
        const ids = parseValueIds(value);
        await ensureMetaTableValuesExist(field.metaTable, ids, field.label);
      }

      if (WARD_BOOTH_FIELD_KEYS.has(field.fieldKey) && value) {
        const metaTableName = WARD_BOOTH_META_TABLES.get(field.fieldKey);
        if (metaTableName) {
          const ids = parseValueIds(value);
          await ensureMetaTableValuesExist(metaTableName, ids, field.label);
        }
      }
    }

    // Validate required fields that were not submitted at all
    for (const field of formFields) {
      if (field.isRequired !== 1) continue;
      const hasValue = fieldValues.some((fv) => fv.formFieldId === field.id);
      const hasFiles = filesByFieldId.has(field.id);
      if (!hasValue && !hasFiles) {
        throw new ApiError(`Field "${field.label}" is required`, 400);
      }
    }

    // Create submission
    const submission = await FormSubmission.create(
      {
        formEventId: formEventIdNum,
        submittedBy: userId,
        submittedAt: new Date(),
        ipAddress: req.ip || null,
        userAgent: req.get("user-agent") || null,
        status: 1
      },
      { transaction }
    );

    // Reorganize files to final directory structure: formEventId/submissionId/fieldId/uuid.ext
    const finalFileUrlsByFieldId = new Map<number, string[]>();
    for (const [fieldId, files] of filesByFieldId) {
      const finalUrls: string[] = [];
      const finalDir = path.join(
        UPLOAD_PATHS.BASE_DIR,
        String(formEventIdNum),
        String(submission.id),
        String(fieldId)
      );
      ensureDirectory(finalDir);

      for (const file of files) {
        if (fs.existsSync(file.path)) {
          const ext = path.extname(file.path);
          const uuid = randomUUID();
          const finalFileName = `${uuid}${ext}`;
          const finalFilePath = path.join(finalDir, finalFileName);

          // Move file to final location
          fs.renameSync(file.path, finalFilePath);

          // Store relative path for database: formEventId/submissionId/fieldId/uuid.ext
          finalUrls.push(buildPublicUploadPath(finalFilePath));
        }
      }

      if (finalUrls.length > 0) {
        finalFileUrlsByFieldId.set(fieldId, finalUrls);
      }
    }

    // Create field values (including file URLs if any)
    const fieldValueRecords = fieldValues.map((fv: any) => {
      const field = fieldMap.get(fv.formFieldId)!;
      let finalValue = normalizeFieldValue(fv.value);
      if (WARD_BOOTH_FIELD_KEYS.has(field.fieldKey)) {
        finalValue = normalizeWardBoothValue(fv.value);
      }

      // If field has file uploads, include them (as JSON array or URL string)
      if (finalFileUrlsByFieldId.has(fv.formFieldId)) {
        const fileUrls = finalFileUrlsByFieldId.get(fv.formFieldId)!;
        finalValue = fileUrls.length === 1 ? fileUrls[0] : JSON.stringify(fileUrls);
      }

      return {
        formSubmissionId: submission.id,
        formFieldId: fv.formFieldId,
        fieldKey: field.fieldKey,
        value: finalValue
      };
    });

    await FormFieldValue.bulkCreate(fieldValueRecords, { transaction });

    await transaction.commit();

    // Fetch full submission with values
    const fullSubmission = await FormSubmission.findByPk(submission.id, {
      attributes: ["id", "formEventId", "submittedBy", "submittedAt", "ipAddress", "userAgent"],
      include: [
        {
          model: FormFieldValue,
          as: "fieldValues",
          attributes: ["id", "formFieldId", "fieldKey", "value"]
        },
        {
          model: FormEvent,
          as: "formEvent",
          attributes: ["id", "title", "formId"]
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "email"]
        }
      ]
    });

    if (fullSubmission) {
      await resolveFieldValuesForSubmissions(fullSubmission);
    }

    sendCreated(res, fullSubmission, "Form submitted successfully");
  } catch (error) {
    // Only rollback if transaction is still pending
    // if (!transaction.finished) {
    //   await transaction.rollback();
    // }
    throw error;
  }
});

/**
 * Update a form submission by ID
 */
export const updateFormSubmission = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { submissionId } = req.params;
    const fieldValuesFromBody = buildFieldValuesFromBody(req.body as Record<string, unknown>);
    const userId = req.user?.id;
    const uploadedFiles = Array.isArray((req as any).files)
      ? ((req as any).files as Express.Multer.File[])
      : [];

    if (!userId) {
      throw new ApiError("Unauthorized", 401);
    }

    const submissionIdNum = Number(submissionId);
    if (!Number.isFinite(submissionIdNum) || submissionIdNum <= 0) {
      throw new ApiError("Invalid submissionId", 400);
    }

    if (fieldValuesFromBody.length === 0 && uploadedFiles.length === 0) {
      throw new ApiError("Form data must include at least one field value", 400);
    }

    const submission = await FormSubmission.findByPk(submissionIdNum);
    if (!submission || submission.status === 0) {
      throw new ApiError("Form submission not found", 404);
    }

    // Check authorization - user can update their own submissions; Admins can update all
    if (submission.submittedBy !== userId && !req.user?.roles.includes("admin")) {
      throw new ApiError("You don't have permission to update this submission", 403);
    }

    const transaction = await sequelize.transaction();

    try {
      // Load form event and fields for validation
      const formEvent = await FormEvent.findByPk(submission.formEventId, {
        include: [
          {
            model: Form,
            as: "form",
            include: [
              {
                model: FormField,
                as: "fields"
              }
            ]
          }
        ],
        transaction
      });

      if (!formEvent) {
        throw new ApiError("Form event not found", 404);
      }

      const form = formEvent.form;
      if (!form) {
        throw new ApiError("Form not found", 404);
      }

      const formFields = form.fields || [];
      const fieldMap = new Map(formFields.map((f) => [f.id, f]));

      const filesByFieldId = mapFilesByFieldId(uploadedFiles);
      const fieldValues = [...fieldValuesFromBody];

      for (const fieldId of filesByFieldId.keys()) {
        if (!fieldValues.some((fv) => fv.formFieldId === fieldId)) {
          fieldValues.push({ formFieldId: fieldId, value: "" });
        }
      }

      // Validate files per field (max 5 files per field)
      for (const [fieldId, files] of filesByFieldId) {
        if (files.length > 5) {
          throw new ApiError(`Field "${fieldId}" can have at most 5 files`, 400);
        }
      }

      // Validate each submitted field value (only for provided fields)
      for (const fv of fieldValues) {
        const field = fieldMap.get(fv.formFieldId);

        if (!field) {
          throw new ApiError(`Field ID ${fv.formFieldId} does not belong to this form`, 400);
        }

        const value = fv.value !== undefined && fv.value !== null ? String(fv.value).trim() : "";

        if (!value && !filesByFieldId.has(fv.formFieldId)) continue;

        if (field.minLength && value.length < field.minLength) {
          throw new ApiError(`"${field.label}" must be at least ${field.minLength} characters`, 400);
        }

        if (field.maxLength && value.length > field.maxLength) {
          throw new ApiError(`"${field.label}" must not exceed ${field.maxLength} characters`, 400);
        }

        if (field.validationRegex && value) {
          const regex = new RegExp(field.validationRegex);
          if (!regex.test(value)) {
            throw new ApiError(`"${field.label}" format is invalid`, 400);
          }
        }

        if (value) {
          const num = Number(value);
          if (!Number.isNaN(num)) {
            if (field.minValue && num < Number(field.minValue)) {
              throw new ApiError(`"${field.label}" must be at least ${field.minValue}`, 400);
            }
            if (field.maxValue && num > Number(field.maxValue)) {
              throw new ApiError(`"${field.label}" must not exceed ${field.maxValue}`, 400);
            }
          }
        }

        if (field.metaTable && value) {
          const ids = parseValueIds(value);
          await ensureMetaTableValuesExist(field.metaTable, ids, field.label);
        }

        if (WARD_BOOTH_FIELD_KEYS.has(field.fieldKey) && value) {
          const metaTableName = WARD_BOOTH_META_TABLES.get(field.fieldKey);
          if (metaTableName) {
            const ids = parseValueIds(value);
            await ensureMetaTableValuesExist(metaTableName, ids, field.label);
          }
        }
      }

      // Reorganize files to final directory structure
      const finalFileUrlsByFieldId = new Map<number, string[]>();
      for (const [fieldId, files] of filesByFieldId) {
        const finalUrls: string[] = [];
        const finalDir = path.join(
          UPLOAD_PATHS.BASE_DIR,
          String(formEvent.id),
          String(submission.id),
          String(fieldId)
        );
        ensureDirectory(finalDir);

        for (const file of files) {
          if (fs.existsSync(file.path)) {
            const ext = path.extname(file.path);
            const uuid = randomUUID();
            const finalFileName = `${uuid}${ext}`;
            const finalFilePath = path.join(finalDir, finalFileName);

            fs.renameSync(file.path, finalFilePath);

            finalUrls.push(buildPublicUploadPath(finalFilePath));
          }
        }

        if (finalUrls.length > 0) {
          finalFileUrlsByFieldId.set(fieldId, finalUrls);
        }
      }

      const fieldValueRecords = fieldValues.map((fv: any) => {
        const field = fieldMap.get(fv.formFieldId)!;
        let finalValue = normalizeFieldValue(fv.value);
        if (WARD_BOOTH_FIELD_KEYS.has(field.fieldKey)) {
          finalValue = normalizeWardBoothValue(fv.value);
        }

        if (finalFileUrlsByFieldId.has(fv.formFieldId)) {
          const fileUrls = finalFileUrlsByFieldId.get(fv.formFieldId)!;
          finalValue = fileUrls.length === 1 ? fileUrls[0] : JSON.stringify(fileUrls);
        }

        return {
          formSubmissionId: submission.id,
          formFieldId: fv.formFieldId,
          fieldKey: field.fieldKey,
          value: finalValue
        };
      });

      const fieldIds = fieldValueRecords.map((record) => record.formFieldId);
      const existingValues = await FormFieldValue.findAll({
        where: {
          formSubmissionId: submission.id,
          formFieldId: { [Op.in]: fieldIds }
        },
        transaction
      });
      const existingMap = new Map<number, FormFieldValue>();
      for (const existing of existingValues) {
        existingMap.set(existing.formFieldId, existing);
      }

      const creates: any[] = [];
      const updates: Promise<any>[] = [];

      for (const record of fieldValueRecords) {
        const existing = existingMap.get(record.formFieldId);
        if (existing) {
          updates.push(
            existing.update(
              {
                fieldKey: record.fieldKey,
                value: record.value
              },
              { transaction }
            )
          );
        } else {
          creates.push(record);
        }
      }

      if (creates.length > 0) {
        await FormFieldValue.bulkCreate(creates, { transaction });
      }
      if (updates.length > 0) {
        await Promise.all(updates);
      }

      await transaction.commit();

      const updatedSubmission = await FormSubmission.findByPk(submission.id, {
        attributes: ["id", "formEventId", "submittedBy", "submittedAt", "ipAddress", "userAgent"],
        include: [
          {
            model: FormFieldValue,
            as: "fieldValues",
            attributes: ["id", "formFieldId", "fieldKey", "value"]
          },
          {
            model: FormEvent,
            as: "formEvent",
            attributes: ["id", "title", "formId"]
          },
          {
            model: User,
            as: "user",
            attributes: ["id", "email"]
          }
        ]
      });

      if (updatedSubmission) {
        await resolveFieldValuesForSubmissions(updatedSubmission);
      }

      sendSuccess(res, updatedSubmission, "Form submission updated successfully");
    } catch (error) {
      // Only rollback if transaction is still pending
      // if (!transaction.finished) {
      //   await transaction.rollback();
      // }
      throw error;
    }
  }
);

/**
 * Get form submission by ID
 */
export const getFormSubmission = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { submissionId } = req.params;
  const userId = req.user?.id;

  const submissionIdNum = Number(submissionId);
  if (!Number.isFinite(submissionIdNum) || submissionIdNum <= 0) {
    throw new ApiError("Invalid submissionId", 400);
  }

  const submission = await FormSubmission.findOne({
    where: { id: submissionIdNum, status: { [Op.ne]: 0 } },
    attributes: ["id", "formEventId", "submittedBy", "submittedAt", "ipAddress", "userAgent"],
    include: [
      {
        model: FormFieldValue,
        as: "fieldValues",
        attributes: ["id", "formFieldId", "fieldKey", "value"]
      },
      {
        model: FormEvent,
        as: "formEvent",
        include: [
          {
            model: Form,
            as: "form",
            include: [
              {
                model: FormField,
                as: "fields"
              }
            ]
          }
        ]
      },
      {
        model: User,
        as: "user",
        include: [
          {
            model: UserProfile,
            as: "profile"
          }
        ]
      }
    ]
  });

  if (!submission) {
    return sendNotFound(res, "Form submission not found");
  }

  // Check authorization - user can view their own submissions; Admins can view all
  if (submission.submittedBy !== userId && !req.user?.roles.includes("admin")) {
    throw new ApiError("You don't have permission to view this submission", 403);
  }

  await resolveFieldValuesForSubmissions(submission);

  sendSuccess(res, submission);
});

/**
 * List form submissions for a form event
 */
export const listFormSubmissions = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { formEventId } = req.params;
    const {
      page = "1",
      limit = "25",
      status,
      sortBy = "submittedAt",
      sortOrder = "DESC"
    } = req.query;

    const formEventIdNum = Number(formEventId);
    if (!Number.isFinite(formEventIdNum) || formEventIdNum <= 0) {
      throw new ApiError("Invalid formEventId", 400);
    }

    // Parse pagination
    const {
      page: pageNum,
      limit: limitNum,
      offset
    } = parsePaginationParams(String(page), String(limit), 25, 100);

    // Validate sort column
    validateSortColumn(String(sortBy), DEFAULT_SORT_COLUMNS);
    const direction = parseSortDirection(String(sortOrder));

    // Build where clause
    const where: any = { formEventId: formEventIdNum, status: { [Op.ne]: 0 } };

    if (status) {
      const statusFilter = parseStatusFilter(String(status));
      where.status = statusFilter;
    }

    const { count, rows } = await FormSubmission.findAndCountAll({
      attributes: ["id", "formEventId", "submittedBy", "submittedAt", "ipAddress", "userAgent"],
      where,
      include: [
        {
          model: FormFieldValue,
          as: "fieldValues",
          attributes: ["id", "formFieldId", "fieldKey", "value"]
        },
        {
          model: User,
          as: "user",
          include: [
            {
              model: UserProfile,
              as: "profile"
            }
          ]
        }
      ],
      order: [[String(sortBy), direction]],
      limit: limitNum,
      offset,
      distinct: true
    });

    await resolveFieldValuesForSubmissions(rows);

    sendSuccessWithPagination(res, rows, {
      page: pageNum,
      limit: limitNum,
      total: count,
      totalPages: Math.ceil(count / limitNum)
    });
  }
);

/**
 * List user's own submissions
 */
export const listMySubmissions = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const {
    page = "1",
    limit = "25",
    status,
    sortBy = "submittedAt",
    sortOrder = "DESC"
  } = req.query;

  if (!userId) {
    throw new ApiError("Unauthorized", 401);
  }

  const {
    page: pageNum,
    limit: limitNum,
    offset
  } = parsePaginationParams(String(page), String(limit), 25, 100);

  validateSortColumn(String(sortBy), DEFAULT_SORT_COLUMNS);
  const direction = parseSortDirection(String(sortOrder));

  const where: any = { submittedBy: userId, status: { [Op.ne]: 0 } };

  if (status) {
    const statusFilter = parseStatusFilter(String(status));
    where.status = statusFilter;
  }

  const { count, rows } = await FormSubmission.findAndCountAll({
    attributes: ["id", "formEventId", "submittedBy", "submittedAt"],
    where,
    include: [
      {
        model: FormFieldValue,
        as: "fieldValues",
        attributes: ["id", "formFieldId", "fieldKey", "value"]
      },
      {
        model: FormEvent,
        as: "formEvent",
        attributes: ["id", "title", "formId"]
      }
    ],
    order: [[String(sortBy), direction]],
    limit: limitNum,
    offset,
    distinct: true
  });

  await resolveFieldValuesForSubmissions(rows);

  sendSuccessWithPagination(res, rows, {
    page: pageNum,
    limit: limitNum,
    total: count,
    totalPages: Math.ceil(count / limitNum)
  });
});

/**
 * Update submission status
 */
export const updateSubmissionStatus = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { submissionId } = req.params;
    const { status } = req.body;

    const submissionIdNum = Number(submissionId);
    if (!Number.isFinite(submissionIdNum) || submissionIdNum <= 0) {
      throw new ApiError("Invalid submissionId", 400);
    }

    if (status === undefined) {
      throw new ApiError("status is required", 400);
    }

    const statusNum = Number(status);
    if (!Number.isFinite(statusNum) || ![1, 2, 3].includes(statusNum)) {
      throw new ApiError("status must be 1 (submitted), 2 (reviewed), or 3 (rejected)", 400);
    }

    const submission = await FormSubmission.findByPk(submissionIdNum);
    if (!submission) {
      return sendNotFound(res, "Form submission not found");
    }

    await submission.update({
      status: statusNum
    });

    const updated = await FormSubmission.findByPk(submissionIdNum, {
      attributes: ["id", "formEventId", "submittedBy", "submittedAt", "ipAddress", "userAgent"]
    });

    sendSuccess(res, updated, "Submission status updated successfully");
  }
);

/**
 * Delete submission
 */
export const deleteFormSubmission = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { submissionId } = req.params;

    const submissionIdNum = Number(submissionId);
    if (!Number.isFinite(submissionIdNum) || submissionIdNum <= 0) {
      throw new ApiError("Invalid submissionId", 400);
    }

    const submission = await FormSubmission.findByPk(submissionIdNum);
    if (!submission) {
      return sendNotFound(res, "Form submission not found");
    }

    // Soft delete - mark as deleted
    await submission.update({
      status: 0
    });

    res.status(204).send();
  }
);

/**
 * Get submission stats for a form event
 */
export const getFormEventStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { formEventId } = req.params;

  const formEventIdNum = Number(formEventId);
  if (!Number.isFinite(formEventIdNum) || formEventIdNum <= 0) {
    throw new ApiError("Invalid formEventId", 400);
  }

  // Check if form event exists
  const formEvent = await FormEvent.findByPk(formEventIdNum);
  if (!formEvent) {
    return sendNotFound(res, "Form event not found");
  }

  const stats = await FormSubmission.findAll({
    attributes: [
      [sequelize.fn("COUNT", sequelize.col("id")), "totalSubmissions"],
      ["status", "status"]
    ],
    where: { formEventId: formEventIdNum, status: { [Op.ne]: 0 } },
    group: ["status"],
    raw: true
  });

  const result = {
    formEventId: formEventIdNum,
    totalSubmissions: 0,
    byStatus: {
      submitted: 0,
      reviewed: 0,
      rejected: 0
    }
  };

  for (const stat of stats) {
    const count = Number((stat as any).totalSubmissions);
    const statusVal = (stat as any).status;
    result.totalSubmissions += count;

    if (statusVal === 1) result.byStatus.submitted = count;
    if (statusVal === 2) result.byStatus.reviewed = count;
    if (statusVal === 3) result.byStatus.rejected = count;
  }

  sendSuccess(res, result);
});
