import { Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import {
  sendCreated,
  sendSuccess,
  sendSuccessWithPagination,
  calculatePagination,
  parsePaginationParams,
  validateSortColumn,
  parseSortDirection
} from "../utils/apiResponse";
import { ApiError } from "../middlewares/errorHandler";
import MetaComplaintSector from "../models/MetaComplaintSector";
import { requireAuthenticatedUser } from "../middlewares/authMiddleware";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";

// CREATE
export const createComplaintSector = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id: userId } = requireAuthenticatedUser(req);
    const { dispName, description } = req.body;

    if (!dispName) {
      throw new ApiError("Display name is required", 400);
    }

    const complaintSector = await MetaComplaintSector.create({
      dispName,
      description: description || null,
      status: 1,
      createdBy: userId,
      updatedBy: userId
    });

    return sendCreated(res, complaintSector, "Sector/Department created successfully");
  }
);

// READ ALL
export const getAllComplaintSectors = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { page, limit, offset } = parsePaginationParams(
      req.query.page as string,
      req.query.limit as string,
      10,
      100
    );
    const sortDirection = parseSortDirection(req.query.sort, "ASC");
    const sortColumn = validateSortColumn(
      req.query.sortColumn,
      ["id", "dispName", "createdAt"],
      "dispName"
    );

    const { rows, count } = await MetaComplaintSector.findAndCountAll({
      where: { status: 1 },
      attributes: ["id", "dispName", "description"],
      limit,
      offset,
      order: [[sortColumn, sortDirection]]
    });

    const pagination = calculatePagination(count, page, limit);

    return sendSuccessWithPagination(
      res,
      rows,
      pagination,
      rows.length ? "Sector/Departments fetched successfully" : "No sector/departments found"
    );
  }
);

// READ BY ID
export const getComplaintSectorById = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const complaintSector = await MetaComplaintSector.findOne({
      where: { id, status: 1 },
      attributes: ["id", "dispName", "description"]
    });

    if (!complaintSector) {
      throw new ApiError("Sector/Department not found", 404);
    }

    return sendSuccess(res, complaintSector, "Sector/Department fetched successfully");
  }
);

// UPDATE
export const updateComplaintSector = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id: userId } = requireAuthenticatedUser(req);
    const { id } = req.params;
    const { dispName, description } = req.body;

    const complaintSector = await MetaComplaintSector.findOne({ where: { id, status: 1 } });

    if (!complaintSector) {
      throw new ApiError("Sector/Department not found", 404);
    }

    await complaintSector.update({
      dispName: dispName || complaintSector.dispName,
      description: description !== undefined ? description : complaintSector.description,
      updatedBy: userId
    });

    return sendSuccess(res, complaintSector, "Sector/Department updated successfully");
  }
);

// DELETE (soft delete)
export const deleteComplaintSector = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id: userId } = requireAuthenticatedUser(req);
    const { id } = req.params;

    const complaintSector = await MetaComplaintSector.findOne({ where: { id, status: 1 } });

    if (!complaintSector) {
      throw new ApiError("Sector/Department not found", 404);
    }

    await complaintSector.update({
      status: 0,
      updatedBy: userId
    });

    return sendSuccess(res, null, "Sector/Department deleted successfully");
  }
);
