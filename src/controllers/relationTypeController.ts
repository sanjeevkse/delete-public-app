import type { Request, Response } from "express";
import { Op } from "sequelize";
import type { Attributes, WhereOptions } from "sequelize";

import { ApiError } from "../middlewares/errorHandler";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import MetaRelationType from "../models/MetaRelationType";
import asyncHandler from "../utils/asyncHandler";
import {
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendNotFound,
  sendSuccessWithPagination,
  parsePaginationParams,
  calculatePagination
} from "../utils/apiResponse";

/**
 * List all relation types with pagination and search
 * GET /api/relation-types
 */
export const listRelationTypes = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = parsePaginationParams(
    req.query.page as string,
    req.query.limit as string,
    25,
    100
  );
  const search = (req.query.search as string) ?? "";
  const status = req.query.status as string;

  const filters: WhereOptions<Attributes<MetaRelationType>>[] = [];

  if (search) {
    filters.push({
      [Op.or]: [
        { dispName: { [Op.like]: `%${search}%` } },
      ]
    });
  }

  if (status !== undefined) {
    filters.push({ status: Number.parseInt(status, 10) });
  }

  const where: WhereOptions<Attributes<MetaRelationType>> | undefined = filters.length
    ? { [Op.and]: filters }
    : undefined;

  const { rows, count } = await MetaRelationType.findAndCountAll({
    where,
    limit,
    offset,
    order: [["createdAt", "DESC"]]
  });

  const pagination = calculatePagination(count, page, limit);

  sendSuccessWithPagination(res, rows, pagination, "Relation types retrieved successfully");
});

/**
 * Get a single relation type by ID
 * GET /api/relation-types/:id
 */
export const getRelationType = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const relationType = await MetaRelationType.findByPk(id);

  if (!relationType) {
    return sendNotFound(res, "Relation type not found");
  }

  sendSuccess(res, relationType, "Relation type retrieved successfully");
});

/**
 * Create a new relation type
 * POST /api/relation-types
 */
export const createRelationType = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { dispName, status } = req.body;
  const userId = req.user?.id;

  // Validate required fields
  if (!dispName) {
    throw new ApiError("Missing required field: dispName", 400);
  }

  // Check if display name already exists
  const existingType = await MetaRelationType.findOne({ where: { dispName } });
  if (existingType) {
    throw new ApiError("A relation type with this display name already exists", 409);
  }

  const relationType = await MetaRelationType.create({
    dispName,
    status: status !== undefined ? status : 1,
    createdBy: userId || null,
    updatedBy: userId || null
  });

  sendCreated(res, relationType, "Relation type created successfully");
});

/**
 * Update a relation type
 * PUT /api/relation-types/:id
 */
export const updateRelationType = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { dispName, status } = req.body;
  const userId = req.user?.id;

  const relationType = await MetaRelationType.findByPk(id);

  if (!relationType) {
    return sendNotFound(res, "Relation type not found");
  }

  // Check if display name is being changed and if it already exists
  if (dispName && dispName !== relationType.dispName) {
    const existingType = await MetaRelationType.findOne({
      where: {
        dispName,
        id: { [Op.ne]: id }
      }
    });
    if (existingType) {
      throw new ApiError("A relation type with this display name already exists", 409);
    }
  }

  // Update only provided fields
  if (dispName !== undefined) relationType.dispName = dispName;
  if (status !== undefined) relationType.status = status;
  if (userId) relationType.updatedBy = userId;

  await relationType.save();

  sendSuccess(res, relationType, "Relation type updated successfully");
});

/**
 * Delete a relation type
 * DELETE /api/relation-types/:id
 */
export const deleteRelationType = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const relationType = await MetaRelationType.findByPk(id);

  if (!relationType) {
    return sendNotFound(res, "Relation type not found");
  }

  await relationType.destroy();

  sendNoContent(res);
});

/**
 * Toggle relation type status (activate/deactivate)
 * PATCH /api/relation-types/:id/status
 */
export const toggleRelationTypeStatus = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user?.id;

    const relationType = await MetaRelationType.findByPk(id);

    if (!relationType) {
      return sendNotFound(res, "Relation type not found");
    }

    if (status === undefined) {
      throw new ApiError("Status field is required", 400);
    }

    relationType.status = status;
    if (userId) relationType.updatedBy = userId;
    await relationType.save();

    sendSuccess(res, relationType, "Relation type status updated successfully");
  }
);
