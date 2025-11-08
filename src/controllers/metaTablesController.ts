import type { Request, Response } from "express";
import { Op } from "sequelize";
import type { Model, ModelStatic } from "sequelize";

import { ApiError } from "../middlewares/errorHandler";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import MetaBusinessType from "../models/MetaBusinessType";
import MetaBoothNumber from "../models/MetaBoothNumber";
import MetaCommunityType from "../models/MetaCommunityType";
import MetaMlaConstituency from "../models/MetaMlaConstituency";
import MetaPermission from "../models/MetaPermission";
import MetaPermissionGroup from "../models/MetaPermissionGroup";
import MetaRelationType from "../models/MetaRelationType";
import MetaUserRole from "../models/MetaUserRole";
import MetaWardNumber from "../models/MetaWardNumber";
import MetaSchemeType from "../models/MetaSchemeType";
import MetaSchemeTypeStep from "../models/MetaSchemeTypeStep";
import MetaFieldType from "../models/MetaFieldType";
import MetaInputFormat from "../models/MetaInputFormat";
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

// Exclude audit fields and status from API responses
const excludeFields = ["createdBy", "updatedBy", "status", "createdAt", "updatedAt"];

// Define meta table configuration
interface MetaTableConfig {
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

// Registry of all meta tables
const META_TABLES: Record<string, MetaTableConfig> = {
  businessType: {
    name: "businessType",
    tableName: "meta_business_types",
    displayName: "Business Types",
    model: MetaBusinessType,
    description: "Types of businesses",
    primaryKey: "id",
    searchableFields: ["dispName"],
    hasStatus: true
  },
  boothNumber: {
    name: "boothNumber",
    tableName: "meta_booth_numbers",
    displayName: "Booth Numbers",
    model: MetaBoothNumber,
    description: "Booth numbers for voting",
    primaryKey: "id",
    searchableFields: ["dispName", "num"],
    hasStatus: true,
    customIncludes: [
      {
        association: "mlaConstituency",
        attributes: ["id", "dispName"]
      }
    ]
  },
  communityType: {
    name: "communityType",
    tableName: "meta_community_types",
    displayName: "Community Types",
    model: MetaCommunityType,
    description: "Types of communities",
    primaryKey: "id",
    searchableFields: ["dispName"],
    hasStatus: true
  },
  mlaConstituency: {
    name: "mlaConstituency",
    tableName: "meta_mla_constituencies",
    displayName: "MLA Constituencies",
    model: MetaMlaConstituency,
    description: "MLA constituency details",
    primaryKey: "id",
    searchableFields: ["dispName", "num"],
    hasStatus: true
  },
  permission: {
    name: "permission",
    tableName: "meta_permissions",
    displayName: "Permissions",
    model: MetaPermission,
    description: "System permissions",
    primaryKey: "id",
    searchableFields: ["dispName", "name"],
    hasStatus: true,
    customIncludes: [
      {
        association: "group",
        attributes: ["id", "dispName"]
      }
    ]
  },
  permissionGroup: {
    name: "permissionGroup",
    tableName: "meta_permission_groups",
    displayName: "Permission Groups",
    model: MetaPermissionGroup,
    description: "Groups for organizing permissions",
    primaryKey: "id",
    searchableFields: ["dispName"],
    hasStatus: true
  },
  relationType: {
    name: "relationType",
    tableName: "meta_relation_types",
    displayName: "Relation Types",
    model: MetaRelationType,
    description: "Types of family relations",
    primaryKey: "id",
    searchableFields: ["dispName"],
    hasStatus: true
  },
  userRole: {
    name: "userRole",
    tableName: "meta_user_roles",
    displayName: "User Roles",
    model: MetaUserRole,
    description: "User role definitions",
    primaryKey: "id",
    searchableFields: ["dispName", "name"],
    hasStatus: true
  },
  wardNumber: {
    name: "wardNumber",
    tableName: "meta_ward_numbers",
    displayName: "Ward Numbers",
    model: MetaWardNumber,
    description: "Ward number details",
    primaryKey: "id",
    searchableFields: ["dispName", "num"],
    hasStatus: true
  },
  schemeType: {
    name: "schemeType",
    tableName: "meta_scheme_types",
    displayName: "Scheme Types",
    model: MetaSchemeType,
    description: "Types of schemes",
    primaryKey: "id",
    searchableFields: ["dispName"],
    hasStatus: true
  },
  schemeTypeStep: {
    name: "schemeTypeStep",
    tableName: "meta_scheme_type_steps",
    displayName: "Scheme Type Steps",
    model: MetaSchemeTypeStep,
    description: "Steps for scheme types",
    primaryKey: "id",
    searchableFields: ["dispName"],
    hasStatus: true,
    customIncludes: [
      {
        association: "schemeType",
        attributes: ["id", "dispName"]
      }
    ]
  },
  fieldType: {
    name: "fieldType",
    tableName: "meta_field_types",
    displayName: "Field Types",
    model: MetaFieldType,
    description: "Types of form fields",
    primaryKey: "id",
    searchableFields: ["dispName", "type"],
    hasStatus: true
  },
  inputFormat: {
    name: "inputFormat",
    tableName: "meta_input_formats",
    displayName: "Input Formats",
    model: MetaInputFormat,
    description: "Input format definitions",
    primaryKey: "id",
    searchableFields: ["dispName", "format"],
    hasStatus: true
  }
};

/**
 * List all available meta tables
 * GET /api/meta-tables
 */
export const listMetaTables = asyncHandler(async (_req: Request, res: Response) => {
  const tables = Object.values(META_TABLES).map((config) => ({
    name: config.name,
    tableName: config.tableName,
    displayName: config.displayName,
    description: config.description,
    primaryKey: config.primaryKey,
    searchableFields: config.searchableFields,
    hasStatus: config.hasStatus
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
    100
  );
  const search = (req.query.search as string) ?? "";
  const status = req.query.status as string;

  const config = META_TABLES[tableName];
  if (!config) {
    return sendNotFound(res, `Meta table '${tableName}' not found`);
  }

  const filters: any[] = [];

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

  const pagination = calculatePagination(count, page, limit);

  sendSuccessWithPagination(
    res,
    rows,
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

  const config = META_TABLES[tableName];
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

  sendSuccess(res, record, `${config.displayName} record retrieved successfully`);
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

    const config = META_TABLES[tableName];
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

    sendCreated(res, cleanRecord, `${config.displayName} record created successfully`);
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

    const config = META_TABLES[tableName];
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

    sendSuccess(res, cleanRecord, `${config.displayName} record updated successfully`);
  }
);

/**
 * Delete a record from a meta table
 * DELETE /api/meta-tables/:tableName/data/:id
 */
export const deleteMetaTableRecord = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { tableName, id } = req.params;

    const config = META_TABLES[tableName];
    if (!config) {
      return sendNotFound(res, `Meta table '${tableName}' not found`);
    }

    const record = await config.model.findByPk(id);

    if (!record) {
      return sendNotFound(res, `Record not found in ${config.displayName}`);
    }

    await record.destroy();

    sendNoContent(res);
  }
);

/**
 * Get table schema/structure information
 * GET /api/meta-tables/:tableName/schema
 */
export const getMetaTableSchema = asyncHandler(async (req: Request, res: Response) => {
  const { tableName } = req.params;

  const config = META_TABLES[tableName];
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

  const config = META_TABLES[tableName];
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

  const config = META_TABLES[tableName];
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
