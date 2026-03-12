import type { Request, Response } from "express";
import { Op } from "sequelize";
import type { Model, ModelStatic } from "sequelize";

import { ApiError } from "../middlewares/errorHandler";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import MetaTableRegistry from "../models/MetaTableRegistry";
import MetaTableCollection from "../models/MetaTableCollection";
import MetaTableRegistryCollection from "../models/MetaTableRegistryCollection";
import asyncHandler from "../utils/asyncHandler";
import { assertNoRestrictedFields } from "../utils/payloadValidation";
import {
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendNotFound,
  sendSuccessWithPagination,
  parsePaginationParams,
  calculatePagination
} from "../utils/apiResponse";

// Exclude only audit fields from API responses (keep status)
const excludeFields = ["createdBy", "updatedBy", "createdAt", "updatedAt"];

// Define meta table configuration
interface MetaTableConfig {
  id: number;
  name: string;
  tableName: string;
  displayName: string;
  model: ModelStatic<any>;
  description: string;
  primaryKey: string;
  searchableFields: string[];
  hasStatus?: boolean;
  customIncludes?: any[];
}

/**
 * Cache for loaded models to avoid repeated imports
 */
const modelCache = new Map<string, ModelStatic<any>>();

/**
 * Dynamically load a model by name using require
 * require() works better in production builds than dynamic import()
 */
const loadModel = (modelName: string): ModelStatic<any> => {
  if (modelCache.has(modelName)) {
    return modelCache.get(modelName)!;
  }

  try {
    // Use require for reliable dynamic loading in production builds
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const modelModule = require(`../models/${modelName}`);
    const model = modelModule.default || modelModule;
    modelCache.set(modelName, model);
    return model;
  } catch (error) {
    throw new ApiError(`Failed to load model ${modelName}: ${error}`, 500);
  }
};

/**
 * Build META_TABLES registry with loaded models from database
 */
const buildMetaTablesRegistry = async (): Promise<Record<string, MetaTableConfig>> => {
  const registry: Record<string, MetaTableConfig> = {};

  // Fetch only active meta table configurations from database (status = 1)
  const configs = await MetaTableRegistry.findAll({
    where: { status: 1 },
    attributes: { exclude: ["createdBy", "updatedBy", "createdAt", "updatedAt"] }
  });

  for (const config of configs) {
    const model = loadModel(config.modelName);
    registry[config.name] = {
      id: config.id,
      name: config.name,
      tableName: config.tableName,
      displayName: config.displayName,
      description: config.description || "",
      primaryKey: config.primaryKey,
      searchableFields: config.searchableFields,
      hasStatus: config.hasStatus === 1,
      customIncludes: config.customIncludes || undefined,
      model
    };
  }

  return registry;
};

const ensureEmploymentIncludes = (config: MetaTableConfig): MetaTableConfig => {
  if (config.name !== "employment") {
    return config;
  }

  const includes = Array.isArray(config.customIncludes) ? [...config.customIncludes] : [];
  const hasEmploymentGroup = includes.some((inc: any) => inc?.association === "employmentGroup");
  const hasEmploymentStatus = includes.some(
    (inc: any) => inc?.association === "employmentStatus"
  );

  if (!hasEmploymentGroup) {
    includes.push({ association: "employmentGroup", attributes: ["id", "dispName"], required: false });
  }
  if (!hasEmploymentStatus) {
    includes.push({
      association: "employmentStatus",
      attributes: ["id", "dispName"],
      required: false
    });
  }

  return {
    ...config,
    customIncludes: includes
  };
};

// Initialize the registry (will be populated on first use)
let META_TABLES: Record<string, MetaTableConfig> | null = null;

/**
 * Get the initialized META_TABLES registry
 */
const getMetaTables = async (): Promise<Record<string, MetaTableConfig>> => {
  if (!META_TABLES) {
    const rawRegistry = await buildMetaTablesRegistry();
    META_TABLES = Object.fromEntries(
      Object.entries(rawRegistry).map(([key, config]) => [key, ensureEmploymentIncludes(config)])
    );
  }
  return META_TABLES;
};

/**
 * Invalidate the registry cache (called when registry is updated)
 */
export const invalidateRegistryCache = (): void => {
  META_TABLES = null;
  // Optionally clear model cache too if models change
  // modelCache.clear();
};

/**
 * Get all fields from a model excluding audit fields
 */
const getAllFields = (model: ModelStatic<any>): string[] => {
  const attributes = Object.keys(model.getAttributes());
  return attributes.filter((attr) => !excludeFields.includes(attr));
};

/**
 * Get field metadata including relation information
 */
const getFieldsWithRelations = (model: ModelStatic<any>, config: MetaTableConfig) => {
  const attributes = model.getAttributes();
  const fields: any[] = [];

  for (const [fieldName, attribute] of Object.entries(attributes)) {
    // Skip audit fields
    if (excludeFields.includes(fieldName)) {
      continue;
    }

    const fieldInfo: any = {
      name: fieldName,
      type: (attribute as any).type?.constructor?.name || "unknown"
    };

    // Check if this field has a reference (foreign key)
    const references = (attribute as any).references;
    if (references && references.model) {
      fieldInfo.isForeignKey = true;
      fieldInfo.references = {
        table: references.model,
        key: references.key
      };

      // Try to find the association name from model.associations
      if (model.associations) {
        for (const [assocName, association] of Object.entries(model.associations)) {
          if ((association as any).foreignKey === fieldName) {
            fieldInfo.associationName = assocName;

            // If there's a customInclude for this association, it will have the dispName included
            if (config.customIncludes) {
              const hasCustomInclude = config.customIncludes.some(
                (inc: any) => inc.association === assocName
              );
              if (hasCustomInclude) {
                fieldInfo.includesRelationData = true;
              }
            }
            break;
          }
        }
      }
    }

    fields.push(fieldInfo);
  }

  return fields;
};

const parseOptionalCollectionId = (rawValue: unknown): number | undefined => {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return undefined;
  }

  const normalized = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  const parsed = Number.parseInt(String(normalized), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ApiError("collection_id must be a positive integer", 400);
  }

  return parsed;
};

const getRegistryIdsByCollectionId = async (collectionId: number): Promise<Set<number>> => {
  const rows = await MetaTableRegistryCollection.findAll({
    where: {
      collectionId,
      status: 1
    },
    attributes: ["registryId"],
    include: [
      {
        model: MetaTableCollection,
        as: "collection",
        attributes: [],
        required: true,
        where: { status: 1 }
      }
    ]
  });

  return new Set(rows.map((row) => Number(row.registryId)));
};

/**
 * List all available meta tables
 * GET /api/meta-tables
 */
export const listMetaTables = asyncHandler(async (req: Request, res: Response) => {
  const metaTables = await getMetaTables();
  const requestedCollectionId = parseOptionalCollectionId(
    req.query.collection_id ?? req.query.collectionId ?? req.query.group_id ?? req.query.groupId
  );
  const allowedIds =
    requestedCollectionId !== undefined
      ? await getRegistryIdsByCollectionId(requestedCollectionId)
      : null;

  const tables = Object.values(metaTables)
    .filter((config) => (allowedIds ? allowedIds.has(config.id) : true))
    .map((config) => ({
    id: config.id,
    name: config.name,
    tableName: config.tableName,
    displayName: config.displayName,
    description: config.description,
    primaryKey: config.primaryKey,
    allFields: getAllFields(config.model),
    fieldsWithRelations: getFieldsWithRelations(config.model, config),
    searchableFields: config.searchableFields
    }));

  sendSuccess(res, tables, "Meta tables retrieved successfully");
});

/**
 * Get data from a specific meta table with pagination and search
 * GET /api/meta-tables/:tableName/data
 */
export const getMetaTableData = asyncHandler(async (req: Request, res: Response) => {
  const { tableName } = req.params;
  const { page, limit, offset } = parsePaginationParams(
    req.query.page as string,
    req.query.limit as string,
    25,
    1000
  );
  const search = (req.query.search as string) ?? "";
  const status = req.query.status as string;
  const needAll = req.query.need_all === "1";
  const appendOther =
    req.query.appendOther === "1" ||
    req.query.appendOther === "true" ||
    req.query.append_other === "1" ||
    req.query.append_other === "true";

  const metaTables = await getMetaTables();
  const config = metaTables[tableName];
  if (!config) {
    return sendNotFound(res, `Meta table '${tableName}' not found`);
  }

  const filters: any[] = [];
  const modelFields = new Set(Object.keys(config.model.getAttributes()));
  const reservedQueryParams = new Set([
    "page",
    "limit",
    "search",
    "status",
    "need_all",
    "appendOther",
    "append_other"
  ]);

  // Add search filter
  if (search && config.searchableFields.length > 0) {
    const searchConditions = config.searchableFields.map((field) => ({
      [field]: { [Op.like]: `%${search}%` }
    }));
    filters.push({ [Op.or]: searchConditions });
  }

  // Add status filter
  if (config.hasStatus && status !== undefined) {
    filters.push({ status: Number.parseInt(status, 10) });
  }

  // Add dynamic filters only for valid table fields; ignore unknown query params
  for (const [key, rawValue] of Object.entries(req.query)) {
    if (reservedQueryParams.has(key) || !modelFields.has(key)) {
      continue;
    }

    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    if (value === undefined || value === null || value === "") {
      continue;
    }

    filters.push({ [key]: value });
  }

  const where = filters.length ? { [Op.and]: filters } : undefined;

  const queryOptions: any = {
    where,
    limit,
    offset,
    order: [["id", "ASC"]],
    attributes: { exclude: excludeFields }
  };

  // Add custom includes if defined
  if (config.customIncludes) {
    queryOptions.include = config.customIncludes;
  }

  const { rows, count } = await config.model.findAndCountAll(queryOptions);

  // Add "ALL" option at the beginning if needed_all parameter is present
  let responseData = rows.map((row: any) => {
    if (row && typeof row === "object" && "dataValues" in row) {
      return row.dataValues;
    }
    return row;
  });
  if (needAll) {
    responseData = [{ id: -1, dispName: "-ALL-" }, ...responseData];
  }

  // Append "Other" option at the end only when requested
  if (appendOther) {
    responseData = [
      ...responseData,
      {
        id: -1,
        dispName: "Other",
        description: null,
        icon: "null",
        status: 1
      }
    ];
  }

  const pagination = calculatePagination(count, page, limit);

  sendSuccessWithPagination(
    res,
    responseData,
    pagination,
    `${config.displayName} data retrieved successfully`
  );
});

/**
 * Get a single record from a meta table by ID
 * GET /api/meta-tables/:tableName/data/:id
 */
export const getMetaTableRecord = asyncHandler(async (req: Request, res: Response) => {
  const { tableName, id } = req.params;

  const metaTables = await getMetaTables();
  const config = metaTables[tableName];
  if (!config) {
    return sendNotFound(res, `Meta table '${tableName}' not found`);
  }

  const queryOptions: any = {
    where: { [config.primaryKey]: id },
    attributes: { exclude: excludeFields }
  };

  // Add custom includes if defined
  if (config.customIncludes) {
    queryOptions.include = config.customIncludes;
  }

  const record = await config.model.findOne(queryOptions);

  if (!record) {
    return sendNotFound(res, `Record not found in ${config.displayName}`);
  }

  const cleanRecord =
    record && typeof record === "object" && "dataValues" in record ? record.dataValues : record;

  sendSuccess(res, cleanRecord, `${config.displayName} record retrieved successfully`);
});

/**
 * Create a new record in a meta table
 * POST /api/meta-tables/:tableName/data
 */
export const createMetaTableRecord = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    assertNoRestrictedFields(req.body);

    const { tableName } = req.params;
    const userId = req.user?.id;

    const metaTables = await getMetaTables();
    const config = metaTables[tableName];
    if (!config) {
      return sendNotFound(res, `Meta table '${tableName}' not found`);
    }

    // Add audit fields
    const recordData = {
      ...req.body,
      createdBy: userId,
      updatedBy: userId
    };

    const record = await config.model.create(recordData);

    // Fetch clean record without audit fields
    const cleanRecord = await config.model.findByPk(record.get(config.primaryKey), {
      attributes: { exclude: excludeFields }
    });

    const responseRecord =
      cleanRecord && typeof cleanRecord === "object" && "dataValues" in cleanRecord
        ? cleanRecord.dataValues
        : cleanRecord;

    sendCreated(res, responseRecord, `${config.displayName} record created successfully`);
  }
);

/**
 * Update a record in a meta table
 * PUT /api/meta-tables/:tableName/data/:id
 */
export const updateMetaTableRecord = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    assertNoRestrictedFields(req.body);

    const { tableName, id } = req.params;
    const userId = req.user?.id;

    const metaTables = await getMetaTables();
    const config = metaTables[tableName];
    if (!config) {
      return sendNotFound(res, `Meta table '${tableName}' not found`);
    }

    const record = await config.model.findByPk(id);

    if (!record) {
      return sendNotFound(res, `Record not found in ${config.displayName}`);
    }

    // Add audit fields
    const updateData = {
      ...req.body,
      updatedBy: userId
    };

    await record.update(updateData);

    // Fetch clean record without audit fields
    const cleanRecord = await config.model.findByPk(record.get(config.primaryKey), {
      attributes: { exclude: excludeFields }
    });

    const responseRecord =
      cleanRecord && typeof cleanRecord === "object" && "dataValues" in cleanRecord
        ? cleanRecord.dataValues
        : cleanRecord;

    sendSuccess(res, responseRecord, `${config.displayName} record updated successfully`);
  }
);

/**
 * Delete a record from a meta table
 * DELETE /api/meta-tables/:tableName/data/:id
 */
export const deleteMetaTableRecord = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { tableName, id } = req.params;

    const metaTables = await getMetaTables();
    const config = metaTables[tableName];
    if (!config) {
      return sendNotFound(res, `Meta table '${tableName}' not found`);
    }

    const record = await config.model.findByPk(id);

    if (!record) {
      return sendNotFound(res, `Record not found in ${config.displayName}`);
    }

    await record.update({ status: 0 });

    sendNoContent(res);
  }
);

/**
 * Get table schema/structure information
 * GET /api/meta-tables/:tableName/schema
 */
export const getMetaTableSchema = asyncHandler(async (req: Request, res: Response) => {
  const { tableName } = req.params;

  const metaTables = await getMetaTables();
  const config = metaTables[tableName];
  if (!config) {
    return sendNotFound(res, `Meta table '${tableName}' not found`);
  }

  // Get model attributes
  const attributes = config.model.getAttributes();
  const schema = Object.entries(attributes).map(([fieldName, attribute]) => ({
    fieldName,
    type: attribute.type.constructor.name,
    allowNull: attribute.allowNull,
    primaryKey: attribute.primaryKey || false,
    autoIncrement: attribute.autoIncrement || false,
    defaultValue: attribute.defaultValue,
    unique: attribute.unique || false
  }));

  sendSuccess(
    res,
    {
      tableName: config.tableName,
      displayName: config.displayName,
      description: config.description,
      fields: schema
    },
    "Schema retrieved successfully"
  );
});

/**
 * Bulk update status for multiple records
 * PATCH /api/meta-tables/:tableName/bulk-status
 */
export const bulkUpdateStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { tableName } = req.params;
  const { ids, status } = req.body;
  const userId = req.user?.id;

  const metaTables = await getMetaTables();
  const config = metaTables[tableName];
  if (!config) {
    return sendNotFound(res, `Meta table '${tableName}' not found`);
  }

  if (!config.hasStatus) {
    throw new ApiError(`${config.displayName} does not support status updates`, 400);
  }

  if (!Array.isArray(ids) || ids.length === 0) {
    throw new ApiError("ids must be a non-empty array", 400);
  }

  if (![0, 1].includes(Number(status))) {
    throw new ApiError("status must be 0 or 1", 400);
  }

  const [affectedCount] = await config.model.update(
    { status, updatedBy: userId },
    { where: { [config.primaryKey]: { [Op.in]: ids } } }
  );

  sendSuccess(
    res,
    { affectedCount },
    `${affectedCount} ${config.displayName} record(s) updated successfully`
  );
});

/**
 * Get statistics for a meta table
 * GET /api/meta-tables/:tableName/stats
 */
export const getMetaTableStats = asyncHandler(async (req: Request, res: Response) => {
  const { tableName } = req.params;

  const metaTables = await getMetaTables();
  const config = metaTables[tableName];
  if (!config) {
    return sendNotFound(res, `Meta table '${tableName}' not found`);
  }

  const total = await config.model.count();
  const stats: any = { total };

  if (config.hasStatus) {
    const active = await config.model.count({ where: { status: 1 } });
    const inactive = await config.model.count({ where: { status: 0 } });
    stats.active = active;
    stats.inactive = inactive;
  }

  sendSuccess(res, stats, `${config.displayName} statistics retrieved successfully`);
});
