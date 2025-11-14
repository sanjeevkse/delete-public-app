import type { Response } from "express";
import { Op } from "sequelize";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { ApiError } from "../middlewares/errorHandler";
import MetaMlaConstituency from "../models/MetaMlaConstituency";
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

export const createMlaConstituency = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    assertNoRestrictedFields(req.body);

    const { dispName } = req.body;

    if (!dispName) {
      throw new ApiError("dispName is required", 400);
    }

    const existingMlaConstituency = await MetaMlaConstituency.findOne({ where: { dispName } });
    if (existingMlaConstituency) {
      throw new ApiError("MLA constituency with this name already exists", 409);
    }

    const mlaConstituency = await MetaMlaConstituency.create({
      dispName,
      status: 1,
      createdBy: req.user?.id,
      updatedBy: req.user?.id
    });

    return sendCreated(res, mlaConstituency, "MLA constituency created successfully");
  }
);

export const listMlaConstituencies = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
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

    const { count, rows } = await MetaMlaConstituency.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [["dispName", "ASC"]]
    });

    const pagination = calculatePagination(count, page, limit);

    return sendSuccessWithPagination(
      res,
      rows,
      pagination,
      "MLA constituencies retrieved successfully"
    );
  }
);

export const getMlaConstituencyById = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const mlaConstituency = await MetaMlaConstituency.findByPk(id);

    if (!mlaConstituency) {
      throw new ApiError("MLA constituency not found", 404);
    }

    return sendSuccess(res, mlaConstituency, "MLA constituency retrieved successfully");
  }
);

export const updateMlaConstituency = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    assertNoRestrictedFields(req.body);

    const { dispName } = req.body;

    const mlaConstituency = await MetaMlaConstituency.findByPk(id);

    if (!mlaConstituency) {
      throw new ApiError("MLA constituency not found", 404);
    }

    if (dispName && dispName !== mlaConstituency.dispName) {
      const existingMlaConstituency = await MetaMlaConstituency.findOne({ where: { dispName } });
      if (existingMlaConstituency) {
        throw new ApiError("MLA constituency with this name already exists", 409);
      }
    }

    await mlaConstituency.update({
      dispName: dispName || mlaConstituency.dispName,
      updatedBy: req.user?.id
    });

    return sendSuccess(res, mlaConstituency, "MLA constituency updated successfully");
  }
);

export const toggleMlaConstituencyStatus = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const mlaConstituency = await MetaMlaConstituency.findByPk(id);

    if (!mlaConstituency) {
      throw new ApiError("MLA constituency not found", 404);
    }

    await mlaConstituency.update({
      status: mlaConstituency.status === 1 ? 0 : 1,
      updatedBy: req.user?.id
    });

    return sendSuccess(res, mlaConstituency, "MLA constituency status toggled successfully");
  }
);

export const deleteMlaConstituency = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const mlaConstituency = await MetaMlaConstituency.findByPk(id);

    if (!mlaConstituency) {
      throw new ApiError("MLA constituency not found", 404);
    }

    await mlaConstituency.update({ status: 0 });

    return sendSuccess(res, null, "MLA constituency deleted successfully");
  }
);
