import type { Response } from "express";
import { Op, QueryTypes, Transaction, type Model, type ModelStatic } from "sequelize";

import asyncHandler from "../utils/asyncHandler";
import { ApiError } from "../middlewares/errorHandler";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { requireAuthenticatedUser } from "../middlewares/authMiddleware";
import {
  calculatePagination,
  parsePaginationParams,
  parseSortDirection,
  sendCreated,
  sendSuccess,
  sendSuccessWithPagination,
  validateSortColumn
} from "../utils/apiResponse";
import { assertNoRestrictedFields } from "../utils/payloadValidation";
import FormEvent from "../models/FormEvent";
import Form from "../models/Form";
import FormField from "../models/FormField";
import FormFieldOption from "../models/FormFieldOption";
import FormEventAccessibility from "../models/FormEventAccessibility";
import sequelize from "../config/database";
import { getMetaTableByTableName } from "../utils/metaTableRegistry";
import {
  buildAccessibilityInclude,
  validateAccessibilityPayload,
  ensureAccessibilityReferencesExist,
  type AccessibilityPayload
} from "../services/accessibilityService";
import { buildAccessibilityFilter } from "../services/userHierarchyService";
import GeoPolitical from "../models/GeoPolitical";

const DEFAULT_SORT_COLUMNS = ["startDate", "endDate", "createdAt", "title"];
const DROPDOWN_FIELD_TYPES = new Set(["select", "dropdown"]);
type FormEventRecord = Record<string, unknown>;
type GeoEntity = "state" | "mp" | "mla" | "gp" | "village";

const GEO_TABLE_CONFIG: Record<GeoEntity, { tableName: string }> = {
  state: { tableName: "tbl_meta_state" },
  mp: { tableName: "tbl_meta_mp_constituency" },
  mla: { tableName: "tbl_meta_mla_constituency" },
  gp: { tableName: "tbl_meta_gram_panchayat" },
  village: { tableName: "tbl_meta_main_village" }
};

const getBaseIncludes = () => [
  buildAccessibilityInclude(),
  {
    model: Form,
    as: "form",
    include: [
      {
        model: FormField,
        as: "fields",
        include: [
          {
            model: FormFieldOption,
            as: "options"
          },
          {
            association: "fieldType",
            required: false,
            attributes: ["id", "fieldType", "dispName"]
          }
        ]
      }
    ]
  }
];

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

const toIdDisplayName = (
  id: unknown,
  displayNameMap: Map<number, string>
): { id: number; displayName: string | null; dispName: string | null } | null => {
  if (!isPositiveInteger(id)) {
    return null;
  }

  const displayName = displayNameMap.get(id) ?? null;
  return {
    id,
    displayName,
    dispName: displayName
  };
};

const buildGeoLookupMap = async (
  tableName: string,
  ids: number[]
): Promise<Map<number, string>> => {
  const uniqueIds = Array.from(new Set(ids.filter((id) => Number.isInteger(id) && id > 0)));
  if (uniqueIds.length === 0) {
    return new Map<number, string>();
  }

  const rows = await sequelize.query<{ id: number; dispName: string }>(
    `SELECT id, CAST(disp_name AS CHAR(255)) AS dispName
     FROM ${tableName}
     WHERE status = 1 AND id IN (:ids)`,
    {
      replacements: { ids: uniqueIds },
      type: QueryTypes.SELECT
    }
  );

  return new Map(rows.map((row) => [Number(row.id), row.dispName]));
};

type GeoMappingRow = {
  wardNumberId: number;
  boothNumberId: number;
  stateId: number;
  mpConstituencyId: number;
  mlaConstituencyId: number;
  gramPanchayatId: number;
  mainVillageId: number;
};

const enrichAccessibilityGeoFields = async (eventData: FormEventRecord): Promise<void> => {
  const accessibility = Array.isArray(eventData.accessibility)
    ? (eventData.accessibility as FormEventRecord[])
    : [];
  if (accessibility.length === 0) {
    return;
  }

  const wardIds = Array.from(
    new Set(
      accessibility
        .map((item) => item.wardNumberId)
        .filter((id): id is number => typeof id === "number" && Number.isInteger(id) && id > 0)
    )
  );
  const boothIds = Array.from(
    new Set(
      accessibility
        .map((item) => item.boothNumberId)
        .filter((id): id is number => typeof id === "number" && Number.isInteger(id) && id > 0)
    )
  );

  if (wardIds.length === 0 && boothIds.length === 0) {
    accessibility.forEach((target) => {
      target.stateId = null;
      target.mpConstituencyId = null;
      target.mlaConstituencyId = null;
      target.gramPanchayatId = null;
      target.mainVillageId = null;
      target.state = null;
      target.mp = null;
      target.mla = null;
      target.gp = null;
      target.village = null;
    });
    return;
  }

  const geoRows = await sequelize.query<GeoMappingRow>(
    `
      SELECT
        gp.ward_number_id AS wardNumberId,
        gp.booth_number_id AS boothNumberId,
        gp.state_id AS stateId,
        gp.mp_constituency_id AS mpConstituencyId,
        gp.mla_constituency_id AS mlaConstituencyId,
        gp.gram_panchayat_id AS gramPanchayatId,
        gp.main_village_id AS mainVillageId
      FROM tbl_geo_political gp
      WHERE
        (${wardIds.length > 0 ? "gp.ward_number_id IN (:wardIds)" : "1=0"})
        OR
        (${boothIds.length > 0 ? "gp.booth_number_id IN (:boothIds)" : "1=0"})
    `,
    {
      replacements: { wardIds, boothIds },
      type: QueryTypes.SELECT
    }
  );

  const pairMap = new Map<string, GeoMappingRow>();
  const boothMap = new Map<number, GeoMappingRow>();
  const wardMap = new Map<number, GeoMappingRow>();
  for (const row of geoRows) {
    const pairKey = `${row.wardNumberId}:${row.boothNumberId}`;
    if (!pairMap.has(pairKey)) {
      pairMap.set(pairKey, row);
    }
    if (!boothMap.has(row.boothNumberId)) {
      boothMap.set(row.boothNumberId, row);
    }
    if (!wardMap.has(row.wardNumberId)) {
      wardMap.set(row.wardNumberId, row);
    }
  }

  const selectedRows: GeoMappingRow[] = [];
  for (const target of accessibility) {
    const wardId = typeof target.wardNumberId === "number" ? target.wardNumberId : null;
    const boothId = typeof target.boothNumberId === "number" ? target.boothNumberId : null;
    const selected =
      wardId && wardId > 0 && boothId && boothId > 0
        ? pairMap.get(`${wardId}:${boothId}`) ?? boothMap.get(boothId) ?? wardMap.get(wardId)
        : boothId && boothId > 0
          ? boothMap.get(boothId)
          : wardId && wardId > 0
            ? wardMap.get(wardId)
            : undefined;

    target.stateId = selected?.stateId ?? null;
    target.mpConstituencyId = selected?.mpConstituencyId ?? null;
    target.mlaConstituencyId = selected?.mlaConstituencyId ?? null;
    target.gramPanchayatId = selected?.gramPanchayatId ?? null;
    target.mainVillageId = selected?.mainVillageId ?? null;

    if (selected) {
      selectedRows.push(selected);
    }
  }

  const ids = {
    state: Array.from(new Set(selectedRows.map((row) => row.stateId).filter((id) => id > 0))),
    mp: Array.from(
      new Set(selectedRows.map((row) => row.mpConstituencyId).filter((id) => id > 0))
    ),
    mla: Array.from(
      new Set(selectedRows.map((row) => row.mlaConstituencyId).filter((id) => id > 0))
    ),
    gp: Array.from(new Set(selectedRows.map((row) => row.gramPanchayatId).filter((id) => id > 0))),
    village: Array.from(new Set(selectedRows.map((row) => row.mainVillageId).filter((id) => id > 0)))
  };

  const [stateMap, mpMap, mlaMap, gpMap, villageMap] = await Promise.all([
    buildGeoLookupMap(GEO_TABLE_CONFIG.state.tableName, ids.state),
    buildGeoLookupMap(GEO_TABLE_CONFIG.mp.tableName, ids.mp),
    buildGeoLookupMap(GEO_TABLE_CONFIG.mla.tableName, ids.mla),
    buildGeoLookupMap(GEO_TABLE_CONFIG.gp.tableName, ids.gp),
    buildGeoLookupMap(GEO_TABLE_CONFIG.village.tableName, ids.village)
  ]);

  for (const target of accessibility) {
    target.state = toIdDisplayName(target.stateId, stateMap);
    target.mp = toIdDisplayName(target.mpConstituencyId, mpMap);
    target.mla = toIdDisplayName(target.mlaConstituencyId, mlaMap);
    target.gp = toIdDisplayName(target.gramPanchayatId, gpMap);
    target.village = toIdDisplayName(target.mainVillageId, villageMap);
  }
};

const ensureNumber = (value: unknown, field: string): number => {
  if (value === undefined || value === null || value === "") {
    throw new ApiError(`${field} is required`, 400);
  }
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw new ApiError(`Invalid ${field}`, 400);
  }
  return num;
};

const ensureNonEmptyString = (value: unknown, field: string): string => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ApiError(`${field} is required`, 400);
  }
  return value.trim();
};

const ensureDateOnly = (value: unknown, field: string): string => {
  if (value === undefined || value === null || value === "") {
    throw new ApiError(`${field} is required`, 400);
  }

  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(`Invalid ${field}`, 400);
  }

  return date.toISOString().slice(0, 10);
};

const ensureOptionalDateOnly = (value: unknown, field: string): string | null => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(`Invalid ${field}`, 400);
  }

  return date.toISOString().slice(0, 10);
};

const toDateOnlyString = (value: unknown): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return undefined;
};

const parseAccessibilityPayload = (value: unknown): AccessibilityPayload[] => {
  return validateAccessibilityPayload(value);
};

const ensureFormExists = async (formId: number): Promise<void> => {
  const form = await Form.findByPk(formId);
  if (!form) {
    throw new ApiError("Form not found", 404);
  }
};

const ensureAccessibilityReferences = async (records: AccessibilityPayload[]): Promise<void> => {
  return ensureAccessibilityReferencesExist(records);
};

const loadFormEventOrThrow = async (id: string | number): Promise<FormEvent> => {
  const event = await FormEvent.findByPk(id);
  if (!event) {
    throw new ApiError("Form event not found", 404);
  }
  return event;
};

const ensureValidDateRange = (startDate: string, endDate: string | null): void => {
  if (endDate && endDate < startDate) {
    throw new ApiError("endDate cannot be earlier than startDate", 400);
  }
};

const replaceAccessibility = async (
  transaction: Transaction,
  formEventId: number,
  userId: number,
  payload: AccessibilityPayload[]
): Promise<void> => {
  await FormEventAccessibility.destroy({
    where: { formEventId },
    transaction
  });

  await FormEventAccessibility.bulkCreate(
    (
      await Promise.all(
        payload.map(async (item) => ({
          formEventId,
          geoUnitId: await resolveFormEventAccessibilityGeoUnitId(item),
          wardNumberId: item.wardNumberId,
          boothNumberId: item.boothNumberId,
          userRoleId: item.userRoleId,
          status: 1,
          createdBy: userId,
          updatedBy: userId
        }))
      )
    ),
    { transaction }
  );
};

const resolveFormEventAccessibilityGeoUnitId = async (
  item: AccessibilityPayload
): Promise<number | null> => {
  if (item.wardNumberId === -1 || item.boothNumberId === -1) {
    return null;
  }

  const where: Record<string, number> = {};
  if (item.wardNumberId > 0) {
    where.wardNumberId = item.wardNumberId;
  }
  if (item.boothNumberId > 0) {
    where.boothNumberId = item.boothNumberId;
  }

  if (Object.keys(where).length === 0) {
    return null;
  }

  const matches = await GeoPolitical.findAll({
    where,
    attributes: ["id"],
    limit: 2,
    raw: true
  });

  return matches.length === 1 ? Number(matches[0].id) : null;
};


const extractMetaTable = (field: any): string | null => {
  if (!field) {
    return null;
  }
  const value = field.metaTable !== undefined ? field.metaTable : undefined;
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return String(value);
};

const isDropdownField = (field: any): boolean => {
  const fieldType =
    typeof field?.fieldType?.fieldType === "string"
      ? field.fieldType.fieldType
      : undefined;
  return fieldType ? DROPDOWN_FIELD_TYPES.has(fieldType) : false;
};

const buildMetaTableOptionsMap = async (
  fields: any[]
): Promise<Record<string, { optionLabel: string; optionValue: any; sortOrder: number; isDefault: 0 }[]>> => {
  const tableNames = new Set<string>();
  for (const field of fields) {
    if (!isDropdownField(field)) {
      continue;
    }
    const tableName = extractMetaTable(field);
    if (tableName) {
      tableNames.add(tableName);
    }
  }

  const optionsByTable: Record<
    string,
    { optionLabel: string; optionValue: any; sortOrder: number; isDefault: 0 }[]
  > = {};

  await Promise.all(
    Array.from(tableNames).map(async (tableName) => {
      const metaTable = await getMetaTableByTableName(tableName);
      if (!metaTable) {
        return;
      }

      const where = metaTable.hasStatus ? { status: 1 } : undefined;
      const rows = await metaTable.model.findAll({
        where,
        order: [[metaTable.primaryKey, "ASC"]]
      });

      optionsByTable[tableName] = rows.map((row: any) => {
        const data =
          row && typeof row === "object" && "dataValues" in row ? row.dataValues : row;
        const labelValue = data?.dispName ?? data?.title ?? "";
        const valueRaw = data?.[metaTable.primaryKey];
        const sortOrder = Number(valueRaw);

        return {
          id: valueRaw !== undefined && valueRaw !== null ? valueRaw : null,
          optionLabel: String(labelValue),
          optionValue: valueRaw !== undefined && valueRaw !== null ? valueRaw : null,
          sortOrder: Number.isNaN(sortOrder) ? 0 : sortOrder,
          isDefault: 0
        };
      });
    })
  );

  return optionsByTable;
};

const applyMetaTableOptionsToEvents = (
  events: any[],
  optionsByTable: Record<
    string,
    { optionLabel: string; optionValue: any; sortOrder: number; isDefault: 0 }[]
  >
): void => {
  for (const event of events) {
    const fields = event?.form?.fields;
    if (!Array.isArray(fields)) {
      continue;
    }
    for (const field of fields) {
      if (!isDropdownField(field)) {
        continue;
      }
      const tableName = extractMetaTable(field);
      if (tableName && optionsByTable[tableName]) {
        field.options = optionsByTable[tableName];
      }
    }
  }
};

export const listFormEvents = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId, roles } = requireAuthenticatedUser(req);
  const normalizedRoles = (roles ?? []).map((role) => String(role).toLowerCase());
  const isAdmin = normalizedRoles.includes("admin");

  const { page, limit, offset } = parsePaginationParams(
    req.query.page as string | undefined,
    req.query.limit as string | undefined,
    20,
    100
  );
  const sortDirection = parseSortDirection(req.query.sort as string | undefined, "DESC");
  const sortColumn = validateSortColumn(req.query.sortColumn, DEFAULT_SORT_COLUMNS, "startDate");

  const where: Record<string, unknown> = {};
  const { status, formId, search, startDateFrom, startDateTo } = req.query;

  if (status !== undefined) {
    where.status = ensureNumber(status, "status");
  }

  if (formId !== undefined) {
    where.formId = ensureNumber(formId, "formId");
  }

  if (search && typeof search === "string" && search.trim()) {
    where.title = { [Op.like]: `%${search.trim()}%` };
  }

  if (startDateFrom && startDateTo) {
    where.startDate = {
      [Op.between]: [
        ensureDateOnly(startDateFrom, "startDateFrom"),
        ensureDateOnly(startDateTo, "startDateTo")
      ]
    };
  } else if (startDateFrom) {
    where.startDate = {
      [Op.gte]: ensureDateOnly(startDateFrom, "startDateFrom")
    };
  } else if (startDateTo) {
    where.startDate = {
      [Op.lte]: ensureDateOnly(startDateTo, "startDateTo")
    };
  }

  // Build accessibility filter for geographic zones (geo-boundary only)
  const accessibilityFilter = isAdmin ? null : await buildAccessibilityFilter(userId);

  // Build include with accessibility filtering
  const includes = getBaseIncludes();
  if (accessibilityFilter) {
    const accessibilityInclude = includes[0] as any;
    accessibilityInclude.where = accessibilityFilter;
    accessibilityInclude.required = true; // INNER JOIN - only return events with matching accessibility
  }

  const { rows, count } = await FormEvent.findAndCountAll({
    where,
    include: includes,
    distinct: true,
    limit,
    offset,
    order: [[sortColumn, sortDirection]]
  });

  const rowsPlain = rows.map((event) =>
    typeof (event as any).toJSON === "function" ? (event as any).toJSON() : event
  );
  const fieldsForOptions: any[] = [];
  for (const event of rowsPlain) {
    const fields = event?.form?.fields;
    if (Array.isArray(fields) && fields.length > 0) {
      fieldsForOptions.push(...fields);
    }
  }
  if (fieldsForOptions.length > 0) {
    const optionsByTable = await buildMetaTableOptionsMap(fieldsForOptions);
    applyMetaTableOptionsToEvents(rowsPlain, optionsByTable);
  }
  await Promise.all(
    rowsPlain.map((event) =>
      enrichAccessibilityGeoFields(event as unknown as FormEventRecord)
    )
  );

  const pagination = calculatePagination(count, page, limit);

  return sendSuccessWithPagination(
    res,
    rowsPlain,
    pagination,
    "Form events fetched successfully"
  );
});

export const getFormEvent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId, roles } = requireAuthenticatedUser(req);
  const normalizedRoles = (roles ?? []).map((role) => String(role).toLowerCase());
  const isAdmin = normalizedRoles.includes("admin");
  const { id } = req.params;

  const includes = getBaseIncludes();
  if (!isAdmin) {
    const accessibilityFilter = await buildAccessibilityFilter(userId);
    if (accessibilityFilter) {
      const accessibilityInclude = includes[0] as any;
      accessibilityInclude.where = accessibilityFilter;
      accessibilityInclude.required = true;
    }
  }

  const event = await FormEvent.findByPk(id, {
    include: includes
  });

  if (!event) {
    throw new ApiError("Form event not found", 404);
  }

  const eventPlain =
    typeof (event as any).toJSON === "function" ? (event as any).toJSON() : event;
  const fieldsForOptions = Array.isArray(eventPlain?.form?.fields)
    ? eventPlain.form.fields
    : [];
  if (fieldsForOptions.length > 0) {
    const optionsByTable = await buildMetaTableOptionsMap(fieldsForOptions);
    applyMetaTableOptionsToEvents([eventPlain], optionsByTable);
  }
  await enrichAccessibilityGeoFields(eventPlain as unknown as FormEventRecord);

  return sendSuccess(res, eventPlain, "Form event retrieved successfully");
});

export const createFormEvent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  assertNoRestrictedFields(req.body);
  const { id: userId } = requireAuthenticatedUser(req);
  const { formId, title, description, startDate, endDate, accessibility } = req.body;

  const normalizedFormId = ensureNumber(formId, "formId");
  const normalizedTitle = ensureNonEmptyString(title, "title");
  const normalizedDescription = ensureNonEmptyString(description, "description");
  const normalizedStartDate = ensureDateOnly(startDate, "startDate");
  const normalizedEndDate = ensureOptionalDateOnly(endDate, "endDate");
  ensureValidDateRange(normalizedStartDate, normalizedEndDate);

  await ensureFormExists(normalizedFormId);

  const accessibilityPayload = parseAccessibilityPayload(accessibility);
  await ensureAccessibilityReferences(accessibilityPayload);

  const created = await sequelize.transaction(async (transaction) => {
    const event = await FormEvent.create(
      {
        formId: normalizedFormId,
        title: normalizedTitle,
        description: normalizedDescription,
        startDate: normalizedStartDate,
        endDate: normalizedEndDate,
        status: 1,
        createdBy: userId,
        updatedBy: userId
      },
      { transaction }
    );

    await FormEventAccessibility.bulkCreate(
      await Promise.all(
        accessibilityPayload.map(async (item) => ({
          formEventId: event.id,
          geoUnitId: await resolveFormEventAccessibilityGeoUnitId(item),
          wardNumberId: item.wardNumberId,
          boothNumberId: item.boothNumberId,
          userRoleId: item.userRoleId,
          status: 1,
          createdBy: userId,
          updatedBy: userId
        }))
      ),
      { transaction }
    );

    return event;
  });

  const fresh = await FormEvent.findByPk(created.id, {
    include: getBaseIncludes()
  });

  const freshPlain =
    fresh && typeof (fresh as any).toJSON === "function" ? (fresh as any).toJSON() : fresh;
  const fieldsForOptions = Array.isArray(freshPlain?.form?.fields)
    ? freshPlain.form.fields
    : [];
  if (fieldsForOptions.length > 0) {
    const optionsByTable = await buildMetaTableOptionsMap(fieldsForOptions);
    applyMetaTableOptionsToEvents([freshPlain], optionsByTable);
  }
  await enrichAccessibilityGeoFields(freshPlain as unknown as FormEventRecord);

  return sendCreated(res, freshPlain, "Form event created successfully");
});

export const updateFormEvent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  assertNoRestrictedFields(req.body, { allow: ["status"] });
  const { id } = req.params;
  const { id: userId } = requireAuthenticatedUser(req);
  const { formId, title, description, startDate, endDate, status, accessibility } = req.body;

  const event = await loadFormEventOrThrow(id);

  const updates: Record<string, unknown> = {};

  if (formId !== undefined) {
    const normalizedFormId = ensureNumber(formId, "formId");
    await ensureFormExists(normalizedFormId);
    updates.formId = normalizedFormId;
  }
  if (title !== undefined) {
    updates.title = ensureNonEmptyString(title, "title");
  }
  if (description !== undefined) {
    updates.description = ensureNonEmptyString(description, "description");
  }
  let normalizedStartDate: string | undefined;
  if (startDate !== undefined) {
    normalizedStartDate = ensureDateOnly(startDate, "startDate");
    updates.startDate = normalizedStartDate;
  }

  let normalizedEndDate: string | null | undefined;
  if (endDate !== undefined) {
    normalizedEndDate = ensureOptionalDateOnly(endDate, "endDate");
    updates.endDate = normalizedEndDate;
  }

  if (status !== undefined) {
    const nextStatus = ensureNumber(status, "status");
    if (![0, 1].includes(nextStatus)) {
      throw new ApiError("status must be 0 or 1", 400);
    }
    updates.status = nextStatus;
  }

  const currentStart = toDateOnlyString(event.getDataValue("startDate"));
  const currentEnd = toDateOnlyString(event.getDataValue("endDate"));
  const futureStartDate = normalizedStartDate ?? currentStart;
  const futureEndDate = normalizedEndDate !== undefined ? normalizedEndDate : (currentEnd ?? null);

  if (futureStartDate) {
    ensureValidDateRange(futureStartDate, futureEndDate ?? null);
  }

  let accessibilityPayload: AccessibilityPayload[] | undefined;
  if (accessibility !== undefined) {
    accessibilityPayload = parseAccessibilityPayload(accessibility);
    await ensureAccessibilityReferences(accessibilityPayload);
  }

  await sequelize.transaction(async (transaction) => {
    if (Object.keys(updates).length > 0) {
      await event.update(
        {
          ...updates,
          updatedBy: userId
        },
        { transaction }
      );
    }

    if (accessibilityPayload) {
      await replaceAccessibility(transaction, event.id, userId, accessibilityPayload);
    }
  });

  const fresh = await FormEvent.findByPk(event.id, {
    include: getBaseIncludes()
  });

  const freshPlain =
    fresh && typeof (fresh as any).toJSON === "function" ? (fresh as any).toJSON() : fresh;
  const fieldsForOptions = Array.isArray(freshPlain?.form?.fields)
    ? freshPlain.form.fields
    : [];
  if (fieldsForOptions.length > 0) {
    const optionsByTable = await buildMetaTableOptionsMap(fieldsForOptions);
    applyMetaTableOptionsToEvents([freshPlain], optionsByTable);
  }
  await enrichAccessibilityGeoFields(freshPlain as unknown as FormEventRecord);

  return sendSuccess(res, freshPlain, "Form event updated successfully");
});

export const deleteFormEvent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { id: userId } = requireAuthenticatedUser(req);

  const event = await loadFormEventOrThrow(id);

  await sequelize.transaction(async (transaction) => {
    await event.update(
      {
        status: 0,
        updatedBy: userId
      },
      { transaction }
    );

    await FormEventAccessibility.update(
      { status: 0, updatedBy: userId },
      {
        where: { formEventId: event.id },
        transaction
      }
    );
  });

  return sendSuccess(res, null, "Form event deleted successfully");
});
