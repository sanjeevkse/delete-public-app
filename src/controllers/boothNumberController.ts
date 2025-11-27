import type { Response } from "express";
import { Op } from "sequelize";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { ApiError } from "../middlewares/errorHandler";
import GeoPolitical from "../models/GeoPolitical";
import MetaBoothNumber from "../models/MetaBoothNumber";
import MetaMlaConstituency from "../models/MetaMlaConstituency";
import asyncHandler from "../utils/asyncHandler";
import { assertNoRestrictedFields } from "../utils/payloadValidation";
import {
  sendSuccess,
  sendCreated,
  parsePaginationParams,
  sendSuccessWithPagination,
  calculatePagination
} from "../utils/apiResponse";

export const createBoothNumber = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  assertNoRestrictedFields(req.body);

  const { mlaConstituencyId, dispName } = req.body;

  if (!mlaConstituencyId) {
    throw new ApiError("mlaConstituencyId is required", 400);
  }

  if (!dispName) {
    throw new ApiError("dispName is required", 400);
  }

  // Verify MLA constituency exists
  const mlaConstituency = await MetaMlaConstituency.findByPk(mlaConstituencyId);
  if (!mlaConstituency) {
    throw new ApiError("MLA constituency not found", 404);
  }

  const boothNumber = await MetaBoothNumber.create({
    mlaConstituencyId,
    dispName,
    status: 1,
    createdBy: req.user?.id,
    updatedBy: req.user?.id
  });

  return sendCreated(res, boothNumber, "Booth number created successfully");
});

export const listBoothNumbers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { page, limit, offset } = parsePaginationParams(
    req.query.page as string,
    req.query.limit as string
  );
  const sortDirection = parseSortDirection(req.query.sort, "ASC");
  const sortColumn = validateSortColumn(req.query.sortColumn, ["id", "dispName", "createdAt"], "dispName");
  const { search, status, mlaConstituencyId, wardNumberId } = req.query;

  const whereClause: any = {};

  if (search && typeof search === "string") {
    whereClause[Op.or] = [{ dispName: { [Op.like]: `%${search}%` } }];
  }

  if (status !== undefined) {
    whereClause.status = status;
  }

  if (mlaConstituencyId) {
    whereClause.mlaConstituencyId = mlaConstituencyId;
  }

  // If filtering by ward number, find booth numbers through GeoPolitical table
  if (wardNumberId) {
    const geoPoliticals = await GeoPolitical.findAll({
      where: { wardNumberId: Number(wardNumberId) },
      attributes: ["boothNumberId"]
    });

    const boothNumberIds = [...new Set(geoPoliticals.map((gp) => gp.boothNumberId))];

    if (boothNumberIds.length > 0) {
      whereClause.id = { [Op.in]: boothNumberIds };
    } else {
      // No booths found for this ward, return empty result
      const pagination = calculatePagination(0, page, limit);
      return sendSuccessWithPagination(res, [], pagination, "Booth numbers retrieved successfully");
    }
  }

  const { count, rows } = await MetaBoothNumber.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: MetaMlaConstituency,
        as: "mlaConstituency",
        attributes: ["id", "dispName", "status"]
      }
    ],
    limit,
    offset,
    order: [[sortColumn, sortDirection]]]]
  });

  const pagination = calculatePagination(count, page, limit);

  return sendSuccessWithPagination(res, rows, pagination, "Booth numbers retrieved successfully");
});

export const getBoothNumberById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const boothNumber = await MetaBoothNumber.findByPk(id, {
    include: [
      {
        model: MetaMlaConstituency,
        as: "mlaConstituency",
        attributes: ["id", "dispName", "status"]
      }
    ]
  });

  if (!boothNumber) {
    throw new ApiError("Booth number not found", 404);
  }

  return sendSuccess(res, boothNumber, "Booth number retrieved successfully");
});

export const updateBoothNumber = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  assertNoRestrictedFields(req.body);

  const { mlaConstituencyId, dispName } = req.body;

  const boothNumber = await MetaBoothNumber.findByPk(id);

  if (!boothNumber) {
    throw new ApiError("Booth number not found", 404);
  }

  // Verify MLA constituency exists if provided
  if (mlaConstituencyId && mlaConstituencyId !== boothNumber.mlaConstituencyId) {
    const mlaConstituency = await MetaMlaConstituency.findByPk(mlaConstituencyId);
    if (!mlaConstituency) {
      throw new ApiError("MLA constituency not found", 404);
    }
  }

  await boothNumber.update({
    mlaConstituencyId: mlaConstituencyId || boothNumber.mlaConstituencyId,
    dispName: dispName || boothNumber.dispName,
    updatedBy: req.user?.id
  });

  const updatedBoothNumber = await MetaBoothNumber.findByPk(id, {
    include: [
      {
        model: MetaMlaConstituency,
        as: "mlaConstituency",
        attributes: ["id", "dispName", "status"]
      }
    ]
  });

  return sendSuccess(res, updatedBoothNumber, "Booth number updated successfully");
});

export const toggleBoothNumberStatus = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const boothNumber = await MetaBoothNumber.findByPk(id);

    if (!boothNumber) {
      throw new ApiError("Booth number not found", 404);
    }

    await boothNumber.update({
      status: boothNumber.status === 1 ? 0 : 1,
      updatedBy: req.user?.id
    });

    return sendSuccess(res, boothNumber, "Booth number status toggled successfully");
  }
);

export const deleteBoothNumber = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const boothNumber = await MetaBoothNumber.findByPk(id);

  if (!boothNumber) {
    throw new ApiError("Booth number not found", 404);
  }

  await boothNumber.update({ status: 0 });

  return sendSuccess(res, null, "Booth number deleted successfully");
});
