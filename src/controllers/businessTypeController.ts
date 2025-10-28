import type { Request, Response } from "express";
import { Op } from "sequelize";
import type { Attributes, WhereOptions } from "sequelize";

import { ApiError } from "../middlewares/errorHandler";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import MetaBusinessType from "../models/MetaBusinessType";
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
 * List all business types with pagination and search
 * GET /api/business-types
 */
export const listBusinessTypes = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = parsePaginationParams(
    req.query.page as string,
    req.query.limit as string,
    25,
    100
  );
  const search = (req.query.search as string) ?? "";
  const status = req.query.status as string;

  const filters: WhereOptions<Attributes<MetaBusinessType>>[] = [];

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

  const where: WhereOptions<Attributes<MetaBusinessType>> | undefined = filters.length
    ? { [Op.and]: filters }
    : undefined;

  const { rows, count } = await MetaBusinessType.findAndCountAll({
    where,
    limit,
    offset,
    order: [["createdAt", "DESC"]]
  });

  const pagination = calculatePagination(count, page, limit);

  sendSuccessWithPagination(res, rows, pagination, "Business types retrieved successfully");
});

/**
 * Get a single business type by ID
 * GET /api/business-types/:id
 */
export const getBusinessType = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const businessType = await MetaBusinessType.findByPk(id);

  if (!businessType) {
    return sendNotFound(res, "Business type not found");
  }

  sendSuccess(res, businessType, "Business type retrieved successfully");
});

/**
 * Create a new business type
 * POST /api/business-types
 */
export const createBusinessType = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { dispName, status } = req.body;
  const userId = req.user?.id;

  // Validate required fields
  if (!dispName) {
    throw new ApiError("Missing required field: dispName", 400);
  }

  // Check if display name already exists
  const existingType = await MetaBusinessType.findOne({ where: { dispName } });
  if (existingType) {
    throw new ApiError("A business type with this display name already exists", 409);
  }

  const businessType = await MetaBusinessType.create({
    dispName,
    status: status !== undefined ? status : 1,
    createdBy: userId || null,
    updatedBy: userId || null
  });

  sendCreated(res, businessType, "Business type created successfully");
});

/**
 * Update a business type
 * PUT /api/business-types/:id
 */
export const updateBusinessType = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { dispName, status } = req.body;
  const userId = req.user?.id;

  const businessType = await MetaBusinessType.findByPk(id);

  if (!businessType) {
    return sendNotFound(res, "Business type not found");
  }

  // Check if display name is being changed and if it already exists
  if (dispName && dispName !== businessType.dispName) {
    const existingType = await MetaBusinessType.findOne({
      where: {
        dispName,
        id: { [Op.ne]: id }
      }
    });
    if (existingType) {
      throw new ApiError("A business type with this display name already exists", 409);
    }
  }

  // Update only provided fields
  if (dispName !== undefined) businessType.dispName = dispName;
  if (status !== undefined) businessType.status = status;
  if (userId) businessType.updatedBy = userId;

  await businessType.save();

  sendSuccess(res, businessType, "Business type updated successfully");
});

/**
 * Delete a business type
 * DELETE /api/business-types/:id
 */
export const deleteBusinessType = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const businessType = await MetaBusinessType.findByPk(id);

  if (!businessType) {
    return sendNotFound(res, "Business type not found");
  }

  await businessType.destroy();

  sendNoContent(res);
});

/**
 * Toggle business type status (activate/deactivate)
 * PATCH /api/business-types/:id/status
 */
export const toggleBusinessTypeStatus = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user?.id;

    const businessType = await MetaBusinessType.findByPk(id);

    if (!businessType) {
      return sendNotFound(res, "Business type not found");
    }

    if (status === undefined) {
      throw new ApiError("Status field is required", 400);
    }

    businessType.status = status;
    if (userId) businessType.updatedBy = userId;
    await businessType.save();

    sendSuccess(res, businessType, "Business type status updated successfully");
  }
);
