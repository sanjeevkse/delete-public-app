import type { Request, Response } from "express";
import { Op } from "sequelize";
import type { Attributes, WhereOptions } from "sequelize";

import { ApiError } from "../middlewares/errorHandler";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import MetaSchemeSector from "../models/MetaSchemeSector";
import asyncHandler from "../utils/asyncHandler";
import { assertNoRestrictedFields } from "../utils/payloadValidation";
import {
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendNotFound,
  sendSuccessWithPagination,
  parsePaginationParams,
  calculatePagination,
  parseSortDirection,
  validateSortColumn
} from "../utils/apiResponse";

/**
 * List all scheme sectors with pagination and search
 * GET /api/scheme-sectors
 */
export const listSchemeSectors = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = parsePaginationParams(
    req.query.page as string,
    req.query.limit as string,
    25,
    100
  );
  const sortDirection = parseSortDirection(req.query.sort, "DESC");
  const sortColumn = validateSortColumn(
    req.query.sortColumn,
    ["id", "dispName", "createdAt"],
    "createdAt"
  );
  const search = (req.query.search as string) ?? "";
  const status = req.query.status as string;

  const filters: WhereOptions<Attributes<MetaSchemeSector>>[] = [];

  if (search) {
    filters.push({
      [Op.or]: [{ dispName: { [Op.like]: `%${search}%` } }]
    });
  }

  if (status !== undefined) {
    filters.push({ status: Number.parseInt(status, 10) });
  }

  const where: WhereOptions<Attributes<MetaSchemeSector>> | undefined = filters.length
    ? { [Op.and]: filters }
    : undefined;

  const { rows, count } = await MetaSchemeSector.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sortColumn, sortDirection]]
  });

  const pagination = calculatePagination(count, page, limit);

  sendSuccessWithPagination(res, rows, pagination, "Scheme sectors retrieved successfully");
});

/**
 * Get a single scheme sector by ID
 * GET /api/scheme-sectors/:id
 */
export const getSchemeSector = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const schemeSector = await MetaSchemeSector.findByPk(id);

  if (!schemeSector) {
    return sendNotFound(res, "Scheme sector not found");
  }

  sendSuccess(res, schemeSector, "Scheme sector retrieved successfully");
});

/**
 * Create a new scheme sector
 * POST /api/scheme-sectors
 */
export const createSchemeSector = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  assertNoRestrictedFields(req.body);

  const { dispName, description } = req.body;
  const userId = req.user?.id;

  // Validate required fields
  if (!dispName) {
    throw new ApiError("Missing required field: dispName", 400);
  }

  // Check if display name already exists
  const existingSector = await MetaSchemeSector.findOne({ where: { dispName } });
  if (existingSector) {
    throw new ApiError("A scheme sector with this display name already exists", 409);
  }

  const schemeSector = await MetaSchemeSector.create({
    dispName,
    description: description || null,
    status: 1,
    createdBy: userId || null,
    updatedBy: userId || null
  });

  sendCreated(res, schemeSector, "Scheme sector created successfully");
});

/**
 * Update a scheme sector
 * PUT /api/scheme-sectors/:id
 */
export const updateSchemeSector = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  assertNoRestrictedFields(req.body);

  const { dispName, description } = req.body;
  const userId = req.user?.id;

  const schemeSector = await MetaSchemeSector.findByPk(id);

  if (!schemeSector) {
    return sendNotFound(res, "Scheme sector not found");
  }

  // Check if display name is being changed and if it already exists
  if (dispName && dispName !== schemeSector.dispName) {
    const existingSector = await MetaSchemeSector.findOne({
      where: {
        dispName,
        id: { [Op.ne]: id }
      }
    });
    if (existingSector) {
      throw new ApiError("A scheme sector with this display name already exists", 409);
    }
  }

  // Update only provided fields
  if (dispName !== undefined) schemeSector.dispName = dispName;
  if (description !== undefined) schemeSector.description = description || null;
  if (userId) schemeSector.updatedBy = userId;

  await schemeSector.save();

  sendSuccess(res, schemeSector, "Scheme sector updated successfully");
});

/**
 * Delete a scheme sector
 * DELETE /api/scheme-sectors/:id
 */
export const deleteSchemeSector = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const schemeSector = await MetaSchemeSector.findByPk(id);

  if (!schemeSector) {
    return sendNotFound(res, "Scheme sector not found");
  }

  await schemeSector.update({ status: 0 });

  sendNoContent(res);
});

/**
 * Toggle scheme sector status (activate/deactivate)
 * PATCH /api/scheme-sectors/:id/status
 */
export const toggleSchemeSectorStatus = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user?.id;

    const schemeSector = await MetaSchemeSector.findByPk(id);

    if (!schemeSector) {
      return sendNotFound(res, "Scheme sector not found");
    }

    if (status === undefined) {
      throw new ApiError("Status field is required", 400);
    }

    schemeSector.status = status;
    if (userId) schemeSector.updatedBy = userId;
    await schemeSector.save();

    sendSuccess(res, schemeSector, "Scheme sector status updated successfully");
  }
);
