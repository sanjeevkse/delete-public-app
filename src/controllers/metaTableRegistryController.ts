import type { Request, Response } from "express";
import { Op } from "sequelize";
import MetaTableRegistry from "../models/MetaTableRegistry";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
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
import { invalidateRegistryCache } from "./metaTablesController";

// Exclude audit fields from API responses
const excludeFields = ["createdBy", "updatedBy", "createdAt", "updatedAt"];

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
  const status = req.query.status as string;

  const filters: any[] = [];

  // Add search filter
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

  // Add status filter - default to active (1) if not specified
  // if (status !== undefined) {
  //   filters.push({ status: Number.parseInt(status, 10) });
  // } else {
  //   filters.push({ status: 1 });
  // }

  const where = filters.length ? { [Op.and]: filters } : undefined;

  const { rows, count } = await MetaTableRegistry.findAndCountAll({
    where,
    limit,
    offset,
    order: [["name", "ASC"]],
    attributes: { exclude: excludeFields }
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
    attributes: { exclude: excludeFields }
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

    // Add audit fields
    const data = {
      ...req.body,
      createdBy: userId,
      updatedBy: userId
    };

    const entry = await MetaTableRegistry.create(data);

    // Invalidate cache so new entry is picked up
    invalidateRegistryCache();

    // Fetch clean record
    const cleanEntry = await MetaTableRegistry.findByPk(entry.id, {
      attributes: { exclude: excludeFields }
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

    // Add audit fields
    const updateData = {
      ...req.body,
      updatedBy: userId
    };

    await entry.update(updateData);

    // Invalidate cache so changes are picked up
    invalidateRegistryCache();

    // Fetch clean record
    const cleanEntry = await MetaTableRegistry.findByPk(entry.id, {
      attributes: { exclude: excludeFields }
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

    // Invalidate cache so deleted entry is removed
    invalidateRegistryCache();

    sendNoContent(res);
  }
);

/**
 * Reload registry cache
 * POST /api/meta-table-registry/reload
 */
export const reloadRegistry = asyncHandler(async (_req: Request, res: Response) => {
  invalidateRegistryCache();
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
