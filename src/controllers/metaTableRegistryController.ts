import type { Request, Response } from "express";
import { Op } from "sequelize";

import MetaTableRegistry from "../models/MetaTableRegistry";
import MetaTableCollection from "../models/MetaTableCollection";
import MetaTableRegistryCollection from "../models/MetaTableRegistryCollection";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { ApiError } from "../middlewares/errorHandler";
import asyncHandler from "../utils/asyncHandler";
import { assertNoRestrictedFields } from "../utils/payloadValidation";
import {
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendNotFound,
  sendSuccessWithPagination,
  sendConflict,
  parsePaginationParams,
  calculatePagination
} from "../utils/apiResponse";
import sequelize from "../config/database";
import { invalidateRegistryCache } from "./metaTablesController";
import { invalidateMetaTableRegistryCache } from "../utils/metaTableRegistry";

// Exclude audit fields from API responses
const excludeFields = ["createdBy", "updatedBy", "createdAt", "updatedAt"];
const collectionNameRegex = /^[a-zA-Z0-9_-]+$/;

const collectionInclude = {
  association: "collections",
  attributes: ["id", "name", "dispName", "description", "status"],
  through: { attributes: [], where: { status: 1 } },
  required: false
};

const invalidateAllRegistryCaches = (): void => {
  invalidateRegistryCache();
  invalidateMetaTableRegistryCache();
};

const parsePositiveInt = (value: unknown, fieldName: string): number => {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ApiError(`${fieldName} must be a positive integer`, 400);
  }
  return parsed;
};

const parseStatusFilter = (raw: unknown): number | undefined => {
  if (raw === undefined || raw === null || raw === "") {
    return undefined;
  }

  const parsed = Number.parseInt(String(raw), 10);
  if (![0, 1].includes(parsed)) {
    throw new ApiError("status must be 0 or 1", 400);
  }

  return parsed;
};

const normalizeRegistryIds = (rawIds: unknown): number[] => {
  if (!Array.isArray(rawIds)) {
    throw new ApiError("registryIds must be a non-empty array", 400);
  }

  const ids = Array.from(
    new Set(
      rawIds
        .map((value) => Number.parseInt(String(value), 10))
        .filter((value) => Number.isInteger(value) && value > 0)
    )
  );

  if (ids.length === 0) {
    throw new ApiError("registryIds must contain at least one valid positive integer", 400);
  }

  return ids;
};

const ensureCollectionExists = async (collectionId: number): Promise<MetaTableCollection> => {
  const collection = await MetaTableCollection.findByPk(collectionId, {
    attributes: { exclude: excludeFields }
  });

  if (!collection || collection.status !== 1) {
    throw new ApiError("Collection not found", 404);
  }

  return collection;
};

const getValidatedActiveRegistryIds = async (ids: number[]): Promise<number[]> => {
  const activeRegistryRows = await MetaTableRegistry.findAll({
    where: {
      id: { [Op.in]: ids },
      status: 1
    },
    attributes: ["id"]
  });

  const activeIdSet = new Set(activeRegistryRows.map((row) => Number(row.id)));
  const invalidIds = ids.filter((id) => !activeIdSet.has(id));

  if (invalidIds.length > 0) {
    throw new ApiError(`Invalid or inactive registryIds: ${invalidIds.join(", ")}`, 400);
  }

  return ids;
};

const resolveTargetRegistryIds = async (
  idsMode: boolean,
  providedIds: unknown,
  allMode: boolean
): Promise<number[]> => {
  if ((idsMode ? 1 : 0) + (allMode ? 1 : 0) !== 1) {
    throw new ApiError("Provide exactly one mode: registryIds or addAll/removeAll", 400);
  }

  if (idsMode) {
    const ids = normalizeRegistryIds(providedIds);
    return getValidatedActiveRegistryIds(ids);
  }

  const activeRegistryRows = await MetaTableRegistry.findAll({
    where: { status: 1 },
    attributes: ["id"]
  });
  return activeRegistryRows.map((row) => Number(row.id));
};

/**
 * Get all registry entries with pagination and search
 * GET /api/meta-table-registry
 */
export const getRegistryEntries = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = parsePaginationParams(
    req.query.page as string,
    req.query.limit as string,
    25,
    100
  );
  const search = (req.query.search as string) ?? "";

  const filters: any[] = [];

  if (search) {
    filters.push({
      [Op.or]: [
        { name: { [Op.like]: `%${search}%` } },
        { displayName: { [Op.like]: `%${search}%` } },
        { tableName: { [Op.like]: `%${search}%` } },
        { modelName: { [Op.like]: `%${search}%` } }
      ]
    });
  }

  const where = filters.length ? { [Op.and]: filters } : undefined;

  const { rows, count } = await MetaTableRegistry.findAndCountAll({
    where,
    limit,
    offset,
    order: [["name", "ASC"]],
    attributes: { exclude: excludeFields },
    include: [collectionInclude],
    distinct: true
  });

  const pagination = calculatePagination(count, page, limit);

  sendSuccessWithPagination(res, rows, pagination, "Registry entries retrieved successfully");
});

/**
 * Get a single registry entry by ID
 * GET /api/meta-table-registry/:id
 */
export const getRegistryEntry = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const entry = await MetaTableRegistry.findByPk(id, {
    attributes: { exclude: excludeFields },
    include: [collectionInclude]
  });

  if (!entry) {
    return sendNotFound(res, "Registry entry not found");
  }

  sendSuccess(res, entry, "Registry entry retrieved successfully");
});

/**
 * Create a new registry entry
 * POST /api/meta-table-registry
 */
export const createRegistryEntry = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    assertNoRestrictedFields(req.body);

    const userId = req.user?.id;

    const data = {
      ...req.body,
      createdBy: userId,
      updatedBy: userId
    };

    const entry = await MetaTableRegistry.create(data);

    invalidateAllRegistryCaches();

    const cleanEntry = await MetaTableRegistry.findByPk(entry.id, {
      attributes: { exclude: excludeFields },
      include: [collectionInclude]
    });

    sendCreated(res, cleanEntry, "Registry entry created successfully");
  }
);

/**
 * Update a registry entry
 * PUT /api/meta-table-registry/:id
 */
export const updateRegistryEntry = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    assertNoRestrictedFields(req.body);

    const { id } = req.params;
    const userId = req.user?.id;

    const entry = await MetaTableRegistry.findByPk(id);

    if (!entry) {
      return sendNotFound(res, "Registry entry not found");
    }

    const updateData = {
      ...req.body,
      updatedBy: userId
    };

    await entry.update(updateData);

    invalidateAllRegistryCaches();

    const cleanEntry = await MetaTableRegistry.findByPk(entry.id, {
      attributes: { exclude: excludeFields },
      include: [collectionInclude]
    });

    sendSuccess(res, cleanEntry, "Registry entry updated successfully");
  }
);

/**
 * Delete (soft delete) a registry entry
 * DELETE /api/meta-table-registry/:id
 */
export const deleteRegistryEntry = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const entry = await MetaTableRegistry.findByPk(id);

    if (!entry) {
      return sendNotFound(res, "Registry entry not found");
    }

    await entry.update({ status: 0 });

    invalidateAllRegistryCaches();

    sendNoContent(res);
  }
);

/**
 * Reload registry cache
 * POST /api/meta-table-registry/reload
 */
export const reloadRegistry = asyncHandler(async (_req: Request, res: Response) => {
  invalidateAllRegistryCaches();
  sendSuccess(res, null, "Registry cache reloaded successfully");
});

/**
 * Get registry statistics
 * GET /api/meta-table-registry/stats
 */
export const getRegistryStats = asyncHandler(async (_req: Request, res: Response) => {
  const total = await MetaTableRegistry.count();
  const active = await MetaTableRegistry.count({ where: { status: 1 } });
  const inactive = await MetaTableRegistry.count({ where: { status: 0 } });

  sendSuccess(res, { total, active, inactive }, "Registry statistics retrieved successfully");
});

/**
 * Get all collections
 * GET /api/meta-table-registry/collections
 */
export const getCollections = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = parsePaginationParams(
    req.query.page as string,
    req.query.limit as string,
    25,
    100
  );

  const search = (req.query.search as string) ?? "";
  const statusFilter = parseStatusFilter(req.query.status);

  const where: any = {};

  if (statusFilter !== undefined) {
    where.status = statusFilter;
  } else {
    where.status = 1;
  }

  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { dispName: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } }
    ];
  }

  const { rows, count } = await MetaTableCollection.findAndCountAll({
    where,
    limit,
    offset,
    order: [["id", "ASC"]],
    attributes: { exclude: excludeFields }
  });

  const pagination = calculatePagination(count, page, limit);
  sendSuccessWithPagination(res, rows, pagination, "Collections retrieved successfully");
});

/**
 * Get collection by id
 * GET /api/meta-table-registry/collections/:id
 */
export const getCollection = asyncHandler(async (req: Request, res: Response) => {
  const collectionId = parsePositiveInt(req.params.id, "id");

  const collection = await MetaTableCollection.findByPk(collectionId, {
    attributes: { exclude: excludeFields }
  });

  if (!collection) {
    return sendNotFound(res, "Collection not found");
  }

  sendSuccess(res, collection, "Collection retrieved successfully");
});

/**
 * Create collection
 * POST /api/meta-table-registry/collections
 */
export const createCollection = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  assertNoRestrictedFields(req.body);

  const userId = req.user?.id;
  const name = String(req.body.name ?? "").trim();
  const dispName = String(req.body.dispName ?? req.body.disp_name ?? "").trim();
  const description =
    req.body.description === undefined || req.body.description === null
      ? null
      : String(req.body.description).trim();

  if (!name || !collectionNameRegex.test(name)) {
    throw new ApiError("name is required and must match ^[a-zA-Z0-9_-]+$", 400);
  }

  if (!dispName) {
    throw new ApiError("dispName is required", 400);
  }

  const existing = await MetaTableCollection.findOne({ where: { name } });
  if (existing && existing.status === 1) {
    return sendConflict(res, "Collection name already exists", "collection");
  }

  const created = await MetaTableCollection.create({
    name,
    dispName,
    description,
    status: 1,
    createdBy: userId,
    updatedBy: userId
  });

  const payload = await MetaTableCollection.findByPk(created.id, {
    attributes: { exclude: excludeFields }
  });

  invalidateAllRegistryCaches();
  sendCreated(res, payload, "Collection created successfully");
});

/**
 * Update collection
 * PUT /api/meta-table-registry/collections/:id
 */
export const updateCollection = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  assertNoRestrictedFields(req.body);

  const userId = req.user?.id;
  const collectionId = parsePositiveInt(req.params.id, "id");

  const collection = await MetaTableCollection.findByPk(collectionId);
  if (!collection) {
    return sendNotFound(res, "Collection not found");
  }

  const updates: Record<string, unknown> = {
    updatedBy: userId
  };

  if (req.body.name !== undefined) {
    const name = String(req.body.name).trim();
    if (!name || !collectionNameRegex.test(name)) {
      throw new ApiError("name must match ^[a-zA-Z0-9_-]+$", 400);
    }

    const duplicate = await MetaTableCollection.findOne({
      where: {
        name,
        id: { [Op.ne]: collectionId }
      }
    });

    if (duplicate && duplicate.status === 1) {
      return sendConflict(res, "Collection name already exists", "collection");
    }

    updates.name = name;
  }

  if (req.body.dispName !== undefined || req.body.disp_name !== undefined) {
    const dispName = String(req.body.dispName ?? req.body.disp_name).trim();
    if (!dispName) {
      throw new ApiError("dispName cannot be empty", 400);
    }
    updates.dispName = dispName;
  }

  if (req.body.description !== undefined) {
    updates.description = req.body.description === null ? null : String(req.body.description).trim();
  }

  if (req.body.status !== undefined) {
    const status = Number.parseInt(String(req.body.status), 10);
    if (![0, 1].includes(status)) {
      throw new ApiError("status must be 0 or 1", 400);
    }
    updates.status = status;
  }

  await collection.update(updates);

  const payload = await MetaTableCollection.findByPk(collection.id, {
    attributes: { exclude: excludeFields }
  });

  invalidateAllRegistryCaches();
  sendSuccess(res, payload, "Collection updated successfully");
});

/**
 * Soft delete collection
 * DELETE /api/meta-table-registry/collections/:id
 */
export const deleteCollection = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const collectionId = parsePositiveInt(req.params.id, "id");

  const collection = await MetaTableCollection.findByPk(collectionId);
  if (!collection) {
    return sendNotFound(res, "Collection not found");
  }

  await sequelize.transaction(async (transaction) => {
    await collection.update(
      {
        status: 0,
        updatedBy: userId
      },
      { transaction }
    );

    await MetaTableRegistryCollection.update(
      { status: 0, updatedBy: userId },
      {
        where: {
          collectionId,
          status: 1
        },
        transaction
      }
    );
  });

  invalidateAllRegistryCaches();
  sendNoContent(res);
});

/**
 * List mapped meta tables for collection
 * GET /api/meta-table-registry/collections/:id/meta-tables
 */
export const getCollectionMetaTables = asyncHandler(async (req: Request, res: Response) => {
  const collectionId = parsePositiveInt(req.params.id, "id");
  await ensureCollectionExists(collectionId);

  const { page, limit, offset } = parsePaginationParams(
    req.query.page as string,
    req.query.limit as string,
    25,
    1000
  );
  const search = (req.query.search as string) ?? "";

  const where: any = { status: 1 };
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { displayName: { [Op.like]: `%${search}%` } },
      { tableName: { [Op.like]: `%${search}%` } },
      { modelName: { [Op.like]: `%${search}%` } }
    ];
  }

  const { rows, count } = await MetaTableRegistry.findAndCountAll({
    where,
    include: [
      {
        association: "collections",
        required: true,
        attributes: [],
        where: { id: collectionId, status: 1 },
        through: { attributes: [], where: { status: 1 } }
      }
    ],
    attributes: { exclude: excludeFields },
    order: [["name", "ASC"]],
    limit,
    offset,
    distinct: true
  });

  const pagination = calculatePagination(count, page, limit);
  sendSuccessWithPagination(
    res,
    rows,
    pagination,
    "Collection meta tables retrieved successfully"
  );
});

/**
 * Add meta tables to collection
 * POST /api/meta-table-registry/collections/:id/meta-tables/add
 */
export const addMetaTablesToCollection = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    const collectionId = parsePositiveInt(req.params.id, "id");

    await ensureCollectionExists(collectionId);

    const idsMode = Array.isArray(req.body.registryIds);
    const addAllMode = req.body.addAll === true;
    const targetRegistryIds = await resolveTargetRegistryIds(idsMode, req.body.registryIds, addAllMode);

    if (targetRegistryIds.length === 0) {
      return sendSuccess(
        res,
        { addedCount: 0, skippedCount: 0, totalRequested: 0 },
        "No active meta tables found to add"
      );
    }

    const result = await sequelize.transaction(async (transaction) => {
      const existingMappings = await MetaTableRegistryCollection.findAll({
        where: {
          collectionId,
          registryId: { [Op.in]: targetRegistryIds }
        },
        attributes: ["id", "registryId", "status"],
        transaction
      });

      const existingByRegistryId = new Map(
        existingMappings.map((mapping) => [Number(mapping.registryId), mapping])
      );

      const toCreate: Array<{ collectionId: number; registryId: number; status: number; createdBy?: number | null; updatedBy?: number | null }> = [];
      const toReactivateIds: number[] = [];
      let skippedCount = 0;

      for (const registryId of targetRegistryIds) {
        const existing = existingByRegistryId.get(registryId);

        if (!existing) {
          toCreate.push({
            collectionId,
            registryId,
            status: 1,
            createdBy: userId,
            updatedBy: userId
          });
          continue;
        }

        if (existing.status === 1) {
          skippedCount += 1;
          continue;
        }

        toReactivateIds.push(registryId);
      }

      if (toReactivateIds.length > 0) {
        await MetaTableRegistryCollection.update(
          { status: 1, updatedBy: userId },
          {
            where: {
              collectionId,
              registryId: { [Op.in]: toReactivateIds }
            },
            transaction
          }
        );
      }

      if (toCreate.length > 0) {
        await MetaTableRegistryCollection.bulkCreate(toCreate, { transaction });
      }

      const addedCount = toCreate.length + toReactivateIds.length;
      return {
        addedCount,
        skippedCount,
        totalRequested: targetRegistryIds.length
      };
    });

    invalidateAllRegistryCaches();
    sendSuccess(res, result, "Meta tables added to collection successfully");
  }
);

/**
 * Remove meta tables from collection
 * POST /api/meta-table-registry/collections/:id/meta-tables/remove
 */
export const removeMetaTablesFromCollection = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    const collectionId = parsePositiveInt(req.params.id, "id");

    await ensureCollectionExists(collectionId);

    const idsMode = Array.isArray(req.body.registryIds);
    const removeAllMode = req.body.removeAll === true;
    const targetRegistryIds = await resolveTargetRegistryIds(
      idsMode,
      req.body.registryIds,
      removeAllMode
    );

    if (targetRegistryIds.length === 0) {
      return sendSuccess(
        res,
        { removedCount: 0, skippedCount: 0, totalRequested: 0 },
        "No active meta tables found to remove"
      );
    }

    const [removedCount] = await MetaTableRegistryCollection.update(
      { status: 0, updatedBy: userId },
      {
        where: {
          collectionId,
          registryId: { [Op.in]: targetRegistryIds },
          status: 1
        }
      }
    );

    const skippedCount = Math.max(targetRegistryIds.length - removedCount, 0);

    invalidateAllRegistryCaches();
    sendSuccess(
      res,
      {
        removedCount,
        skippedCount,
        totalRequested: targetRegistryIds.length
      },
      "Meta tables removed from collection successfully"
    );
  }
);
