import type { Request, Response } from "express";
import { Op } from "sequelize";
import type { Attributes, WhereOptions } from "sequelize";

import { ApiError } from "../middlewares/errorHandler";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import MetaSchemeCategory from "../models/MetaSchemeCategory";
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

/**
 * List all scheme categories with pagination and search
 * GET /api/scheme-categories
 */
export const listSchemeCategories = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = parsePaginationParams(
    req.query.page as string,
    req.query.limit as string,
    25,
    100
  );
  const search = (req.query.search as string) ?? "";
  const status = req.query.status as string;

  const filters: WhereOptions<Attributes<MetaSchemeCategory>>[] = [];

  if (search) {
    filters.push({
      [Op.or]: [{ dispName: { [Op.like]: `%${search}%` } }]
    });
  }

  if (status !== undefined) {
    filters.push({ status: Number.parseInt(status, 10) });
  }

  const where: WhereOptions<Attributes<MetaSchemeCategory>> | undefined = filters.length
    ? { [Op.and]: filters }
    : undefined;

  const { rows, count } = await MetaSchemeCategory.findAndCountAll({
    where,
    limit,
    offset,
    order: [["createdAt", "DESC"]]
  });

  const pagination = calculatePagination(count, page, limit);

  sendSuccessWithPagination(res, rows, pagination, "Scheme categories retrieved successfully");
});

/**
 * Get a single scheme category by ID
 * GET /api/scheme-categories/:id
 */
export const getSchemeCategory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const schemeCategory = await MetaSchemeCategory.findByPk(id);

  if (!schemeCategory) {
    return sendNotFound(res, "Scheme category not found");
  }

  sendSuccess(res, schemeCategory, "Scheme category retrieved successfully");
});

/**
 * Create a new scheme category
 * POST /api/scheme-categories
 */
export const createSchemeCategory = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    assertNoRestrictedFields(req.body);

    const { dispName, description } = req.body;
    const userId = req.user?.id;

    // Validate required fields
    if (!dispName) {
      throw new ApiError("Missing required field: dispName", 400);
    }

    // Check if display name already exists
    const existingCategory = await MetaSchemeCategory.findOne({ where: { dispName } });
    if (existingCategory) {
      throw new ApiError("A scheme category with this display name already exists", 409);
    }

    const schemeCategory = await MetaSchemeCategory.create({
      dispName,
      description: description || null,
      status: 1,
      createdBy: userId || null,
      updatedBy: userId || null
    });

    sendCreated(res, schemeCategory, "Scheme category created successfully");
  }
);

/**
 * Update a scheme category
 * PUT /api/scheme-categories/:id
 */
export const updateSchemeCategory = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    assertNoRestrictedFields(req.body);

    const { dispName, description } = req.body;
    const userId = req.user?.id;

    const schemeCategory = await MetaSchemeCategory.findByPk(id);

    if (!schemeCategory) {
      return sendNotFound(res, "Scheme category not found");
    }

    // Check if display name is being changed and if it already exists
    if (dispName && dispName !== schemeCategory.dispName) {
      const existingCategory = await MetaSchemeCategory.findOne({
        where: {
          dispName,
          id: { [Op.ne]: id }
        }
      });
      if (existingCategory) {
        throw new ApiError("A scheme category with this display name already exists", 409);
      }
    }

    // Update only provided fields
    if (dispName !== undefined) schemeCategory.dispName = dispName;
    if (description !== undefined) schemeCategory.description = description || null;
    if (userId) schemeCategory.updatedBy = userId;

    await schemeCategory.save();

    sendSuccess(res, schemeCategory, "Scheme category updated successfully");
  }
);

/**
 * Delete a scheme category
 * DELETE /api/scheme-categories/:id
 */
export const deleteSchemeCategory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const schemeCategory = await MetaSchemeCategory.findByPk(id);

  if (!schemeCategory) {
    return sendNotFound(res, "Scheme category not found");
  }

  await schemeCategory.update({ status: 0 });

  sendNoContent(res);
});

/**
 * Toggle scheme category status (activate/deactivate)
 * PATCH /api/scheme-categories/:id/status
 */
export const toggleSchemeCategoryStatus = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user?.id;

    const schemeCategory = await MetaSchemeCategory.findByPk(id);

    if (!schemeCategory) {
      return sendNotFound(res, "Scheme category not found");
    }

    if (status === undefined) {
      throw new ApiError("Status field is required", 400);
    }

    schemeCategory.status = status;
    if (userId) schemeCategory.updatedBy = userId;
    await schemeCategory.save();

    sendSuccess(res, schemeCategory, "Scheme category status updated successfully");
  }
);
