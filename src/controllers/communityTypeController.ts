import type { Request, Response } from "express";
import { Op } from "sequelize";
import type { Attributes, WhereOptions } from "sequelize";

import { ApiError } from "../middlewares/errorHandler";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import MetaCommunityType from "../models/MetaCommunityType";
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
 * List all community types with pagination and search
 * GET /api/community-types
 */
export const listCommunityTypes = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = parsePaginationParams(
    req.query.page as string,
    req.query.limit as string,
    25,
    100
  );
  const search = (req.query.search as string) ?? "";
  const status = req.query.status as string;

  const filters: WhereOptions<Attributes<MetaCommunityType>>[] = [];

  if (search) {
    filters.push({
      [Op.or]: [{ dispName: { [Op.like]: `%${search}%` } }]
    });
  }

  if (status !== undefined) {
    filters.push({ status: Number.parseInt(status, 10) });
  }

  const where: WhereOptions<Attributes<MetaCommunityType>> | undefined = filters.length
    ? { [Op.and]: filters }
    : undefined;

  const { rows, count } = await MetaCommunityType.findAndCountAll({
    where,
    limit,
    offset,
    order: [["createdAt", "DESC"]]
  });

  const pagination = calculatePagination(count, page, limit);

  sendSuccessWithPagination(res, rows, pagination, "Community types retrieved successfully");
});

/**
 * Get a single community type by ID
 * GET /api/community-types/:id
 */
export const getCommunityType = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const communityType = await MetaCommunityType.findByPk(id);

  if (!communityType) {
    return sendNotFound(res, "Community type not found");
  }

  sendSuccess(res, communityType, "Community type retrieved successfully");
});

/**
 * Create a new community type
 * POST /api/community-types
 */
export const createCommunityType = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    assertNoRestrictedFields(req.body);

    const { dispName } = req.body;
    const userId = req.user?.id;

    // Validate required fields
    if (!dispName) {
      throw new ApiError("Missing required field: dispName", 400);
    }

    // Check if display name already exists
    const existingType = await MetaCommunityType.findOne({ where: { dispName } });
    if (existingType) {
      throw new ApiError("A community type with this display name already exists", 409);
    }

    const communityType = await MetaCommunityType.create({
      dispName,
      status: 1,
      createdBy: userId || null,
      updatedBy: userId || null
    });

    sendCreated(res, communityType, "Community type created successfully");
  }
);

/**
 * Update a community type
 * PUT /api/community-types/:id
 */
export const updateCommunityType = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    assertNoRestrictedFields(req.body);

    const { dispName } = req.body;
    const userId = req.user?.id;

    const communityType = await MetaCommunityType.findByPk(id);

    if (!communityType) {
      return sendNotFound(res, "Community type not found");
    }

    // Check if display name is being changed and if it already exists
    if (dispName && dispName !== communityType.dispName) {
      const existingType = await MetaCommunityType.findOne({
        where: {
          dispName,
          id: { [Op.ne]: id }
        }
      });
      if (existingType) {
        throw new ApiError("A community type with this display name already exists", 409);
      }
    }

    // Update only provided fields
    if (dispName !== undefined) communityType.dispName = dispName;
    if (userId) communityType.updatedBy = userId;

    await communityType.save();

    sendSuccess(res, communityType, "Community type updated successfully");
  }
);

/**
 * Delete a community type
 * DELETE /api/community-types/:id
 */
export const deleteCommunityType = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const communityType = await MetaCommunityType.findByPk(id);

  if (!communityType) {
    return sendNotFound(res, "Community type not found");
  }

  await communityType.update({ status: 0 });

  sendNoContent(res);
});

/**
 * Toggle community type status (activate/deactivate)
 * PATCH /api/community-types/:id/status
 */
export const toggleCommunityTypeStatus = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user?.id;

    const communityType = await MetaCommunityType.findByPk(id);

    if (!communityType) {
      return sendNotFound(res, "Community type not found");
    }

    if (status === undefined) {
      throw new ApiError("Status field is required", 400);
    }

    communityType.status = status;
    if (userId) communityType.updatedBy = userId;
    await communityType.save();

    sendSuccess(res, communityType, "Community type status updated successfully");
  }
);
