import { Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import {
  sendCreated,
  sendSuccess,
  sendSuccessWithPagination,
  calculatePagination
} from "../utils/apiResponse";
import { ApiError } from "../middlewares/errorHandler";
import MetaSectorDepartment from "../models/MetaSectorDepartment";
import { requireAuthenticatedUser } from "../middlewares/authMiddleware";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";

// CREATE
export const createSectorDepartment = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id: userId } = requireAuthenticatedUser(req);
    const { dispName, description } = req.body;

    if (!dispName) {
      throw new ApiError("Display name is required", 400);
    }

    const sectorDepartment = await MetaSectorDepartment.create({
      dispName,
      description: description || null,
      status: 1,
      createdBy: userId,
      updatedBy: userId
    });

    return sendCreated(res, sectorDepartment, "Sector/Department created successfully");
  }
);

// READ ALL
export const getAllSectorDepartments = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const { rows, count } = await MetaSectorDepartment.findAndCountAll({
      where: { status: 1 },
      attributes: ["id", "dispName", "description"],
      limit,
      offset,
      order: [["dispName", "ASC"]]
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
export const getSectorDepartmentById = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const sectorDepartment = await MetaSectorDepartment.findOne({
      where: { id, status: 1 },
      attributes: ["id", "dispName", "description"]
    });

    if (!sectorDepartment) {
      throw new ApiError("Sector/Department not found", 404);
    }

    return sendSuccess(res, sectorDepartment, "Sector/Department fetched successfully");
  }
);

// UPDATE
export const updateSectorDepartment = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id: userId } = requireAuthenticatedUser(req);
    const { id } = req.params;
    const { dispName, description } = req.body;

    const sectorDepartment = await MetaSectorDepartment.findOne({ where: { id, status: 1 } });

    if (!sectorDepartment) {
      throw new ApiError("Sector/Department not found", 404);
    }

    await sectorDepartment.update({
      dispName: dispName || sectorDepartment.dispName,
      description: description !== undefined ? description : sectorDepartment.description,
      updatedBy: userId
    });

    return sendSuccess(res, sectorDepartment, "Sector/Department updated successfully");
  }
);

// DELETE (soft delete)
export const deleteSectorDepartment = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id: userId } = requireAuthenticatedUser(req);
    const { id } = req.params;

    const sectorDepartment = await MetaSectorDepartment.findOne({ where: { id, status: 1 } });

    if (!sectorDepartment) {
      throw new ApiError("Sector/Department not found", 404);
    }

    await sectorDepartment.update({
      status: 0,
      updatedBy: userId
    });

    return sendSuccess(res, null, "Sector/Department deleted successfully");
  }
);
