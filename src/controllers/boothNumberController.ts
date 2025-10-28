import type { Response } from "express";
import { Op } from "sequelize";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { ApiError } from "../middlewares/errorHandler";
import MetaBoothNumber from "../models/MetaBoothNumber";
import MetaMlaConstituency from "../models/MetaMlaConstituency";
import asyncHandler from "../utils/asyncHandler";
import {
  sendSuccess,
  sendCreated,
  sendNotFound,
  parsePaginationParams,
  sendSuccessWithPagination,
  calculatePagination
} from "../utils/apiResponse";

export const createBoothNumber = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { mlaConstituencyId, dispName, description } = req.body;

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
      description,
      status: 1,
      createdBy: req.user?.id,
      updatedBy: req.user?.id
    });

    return sendCreated(res, boothNumber, "Booth number created successfully");
  }
);

export const listBoothNumbers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { page, limit } = parsePaginationParams(
    req.query.page as string,
    req.query.limit as string
  );
  const { search, status, mlaConstituencyId } = req.query;

  const whereClause: any = {};

  if (search && typeof search === "string") {
    whereClause[Op.or] = [
      { dispName: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } }
    ];
  }

  if (status !== undefined) {
    whereClause.status = status;
  }

  if (mlaConstituencyId) {
    whereClause.mlaConstituencyId = mlaConstituencyId;
  }

  const offset = (page - 1) * limit;

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
    order: [["dispName", "ASC"]]
  });

  const pagination = calculatePagination(count, page, limit);

  return sendSuccessWithPagination(res, rows, pagination, "Booth numbers retrieved successfully");
});

export const getBoothNumberById = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
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
  }
);

export const updateBoothNumber = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { mlaConstituencyId, dispName, description } = req.body;

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
      description: description !== undefined ? description : boothNumber.description,
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
  }
);

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

export const deleteBoothNumber = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const boothNumber = await MetaBoothNumber.findByPk(id);

    if (!boothNumber) {
      throw new ApiError("Booth number not found", 404);
    }

    await boothNumber.destroy();

    return sendSuccess(res, null, "Booth number deleted successfully");
  }
);
