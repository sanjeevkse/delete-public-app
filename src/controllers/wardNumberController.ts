import type { Response } from "express";
import { Op } from "sequelize";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { ApiError } from "../middlewares/errorHandler";
import MetaWardNumber from "../models/MetaWardNumber";
import asyncHandler from "../utils/asyncHandler";
import { assertNoRestrictedFields } from "../utils/payloadValidation";
import {
  sendSuccess,
  sendCreated,
  sendNotFound,
  parsePaginationParams,
  sendSuccessWithPagination,
  calculatePagination
} from "../utils/apiResponse";

export const createWardNumber = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  assertNoRestrictedFields(req.body);

  const { dispName } = req.body;

  if (!dispName) {
    throw new ApiError("dispName is required", 400);
  }

  const existingWardNumber = await MetaWardNumber.findOne({ where: { dispName } });
  if (existingWardNumber) {
    throw new ApiError("Ward number with this name already exists", 409);
  }

  const wardNumber = await MetaWardNumber.create({
    dispName,
    status: 1,
    createdBy: req.user?.id,
    updatedBy: req.user?.id
  });

  return sendCreated(res, wardNumber, "Ward number created successfully");
});

export const listWardNumbers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { page, limit } = parsePaginationParams(
    req.query.page as string,
    req.query.limit as string
  );
  const { search, status } = req.query;

  const whereClause: any = {};

  if (search && typeof search === "string") {
    whereClause[Op.or] = [{ dispName: { [Op.like]: `%${search}%` } }];
  }

  if (status !== undefined) {
    whereClause.status = status;
  }

  const offset = (page - 1) * limit;

  const { count, rows } = await MetaWardNumber.findAndCountAll({
    where: whereClause,
    limit,
    offset,
    order: [["dispName", "ASC"]]
  });

  const pagination = calculatePagination(count, page, limit);

  return sendSuccessWithPagination(res, rows, pagination, "Ward numbers retrieved successfully");
});

export const getWardNumberById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const wardNumber = await MetaWardNumber.findByPk(id);

  if (!wardNumber) {
    throw new ApiError("Ward number not found", 404);
  }

  return sendSuccess(res, wardNumber, "Ward number retrieved successfully");
});

export const updateWardNumber = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  assertNoRestrictedFields(req.body);

  const { dispName } = req.body;

  const wardNumber = await MetaWardNumber.findByPk(id);

  if (!wardNumber) {
    throw new ApiError("Ward number not found", 404);
  }

  if (dispName && dispName !== wardNumber.dispName) {
    const existingWardNumber = await MetaWardNumber.findOne({ where: { dispName } });
    if (existingWardNumber) {
      throw new ApiError("Ward number with this name already exists", 409);
    }
  }

  await wardNumber.update({
    dispName: dispName || wardNumber.dispName,
    updatedBy: req.user?.id
  });

  return sendSuccess(res, wardNumber, "Ward number updated successfully");
});

export const toggleWardNumberStatus = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const wardNumber = await MetaWardNumber.findByPk(id);

    if (!wardNumber) {
      throw new ApiError("Ward number not found", 404);
    }

    await wardNumber.update({
      status: wardNumber.status === 1 ? 0 : 1,
      updatedBy: req.user?.id
    });

    return sendSuccess(res, wardNumber, "Ward number status toggled successfully");
  }
);

export const deleteWardNumber = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const wardNumber = await MetaWardNumber.findByPk(id);

  if (!wardNumber) {
    throw new ApiError("Ward number not found", 404);
  }

  await wardNumber.destroy();

  return sendSuccess(res, null, "Ward number deleted successfully");
});
