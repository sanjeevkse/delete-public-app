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
import MetaComplaintDepartment from "../models/MetaComplaintDepartment";
import { requireAuthenticatedUser } from "../middlewares/authMiddleware";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";

// CREATE
export const createComplaintDepartment = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id: userId } = requireAuthenticatedUser(req);
    const { dispName, description, complaintSectorId } = req.body;

    if (!dispName) {
      throw new ApiError("Display name is required", 400);
    }

    const complaintDepartment = await MetaComplaintDepartment.create({
      dispName,
      description: description || null,
      complaintSectorId: complaintSectorId || null,
      status: 1,
      createdBy: userId,
      updatedBy: userId
    });

    return sendCreated(res, complaintDepartment, "Sector/Department created successfully");
  }
);

// READ ALL
export const getAllComplaintDepartments = asyncHandler(
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

    const where: any = { status: 1 };

    // Filter by complaintSectorId if provided
    if (req.query.complaintSectorId) {
      where.complaintSectorId = req.query.complaintSectorId;
    }

    const { rows, count } = await MetaComplaintDepartment.findAndCountAll({
      where,
      attributes: ["id", "dispName", "description", "complaintSectorId"],
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
export const getComplaintDepartmentById = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const complaintDepartment = await MetaComplaintDepartment.findOne({
      where: { id, status: 1 },
      attributes: ["id", "dispName", "description", "complaintSectorId"]
    });

    if (!complaintDepartment) {
      throw new ApiError("Sector/Department not found", 404);
    }

    return sendSuccess(res, complaintDepartment, "Sector/Department fetched successfully");
  }
);

// UPDATE
export const updateComplaintDepartment = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id: userId } = requireAuthenticatedUser(req);
    const { id } = req.params;
    const { dispName, description, complaintSectorId } = req.body;

    const complaintDepartment = await MetaComplaintDepartment.findOne({ where: { id, status: 1 } });

    if (!complaintDepartment) {
      throw new ApiError("Sector/Department not found", 404);
    }

    await complaintDepartment.update({
      dispName: dispName || complaintDepartment.dispName,
      description: description !== undefined ? description : complaintDepartment.description,
      complaintSectorId:
        complaintSectorId !== undefined ? complaintSectorId : complaintDepartment.complaintSectorId,
      updatedBy: userId
    });

    return sendSuccess(res, complaintDepartment, "Sector/Department updated successfully");
  }
);

// DELETE (soft delete)
export const deleteComplaintDepartment = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id: userId } = requireAuthenticatedUser(req);
    const { id } = req.params;

    const complaintDepartment = await MetaComplaintDepartment.findOne({ where: { id, status: 1 } });

    if (!complaintDepartment) {
      throw new ApiError("Sector/Department not found", 404);
    }

    await complaintDepartment.update({
      status: 0,
      updatedBy: userId
    });

    return sendSuccess(res, null, "Sector/Department deleted successfully");
  }
);
