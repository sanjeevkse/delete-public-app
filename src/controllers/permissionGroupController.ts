import type { Response } from "express";
import { Op } from "sequelize";

import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import MetaPermissionGroup from "../models/MetaPermissionGroup";
import MetaPermission from "../models/MetaPermission";
import { ApiError } from "../middlewares/errorHandler";
import asyncHandler from "../utils/asyncHandler";
import {
  parsePaginationParams,
  sendSuccess,
  validateSortColumn,
  sendSuccessWithPagination,
  calculatePagination,
  parseSortDirection
} from "../utils/apiResponse";
import { assertNoRestrictedFields } from "../utils/payloadValidation";

/**
 * List all permission groups
 * GET /admin/permission-groups
 */
export const listPermissionGroups = asyncHandler(
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
      "id"
    );
    const { status, includePermissions } = req.query;

    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }

    const include =
      includePermissions === "true" ? [{ model: MetaPermission, as: "permissions" }] : [];

    const { rows, count } = await MetaPermissionGroup.findAndCountAll({
      where: whereClause,
      include,
      limit,
      offset,
      order: [[sortColumn, sortDirection]],
      distinct: true
    });

    const pagination = calculatePagination(count, page, limit);
    return sendSuccessWithPagination(
      res,
      rows,
      pagination,
      "Permission groups retrieved successfully"
    );
  }
);

/**
 * Get a single permission group by ID
 * GET /admin/permission-groups/:id
 */
export const getPermissionGroup = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const permissionGroup = await MetaPermissionGroup.findByPk(id, {
    include: [{ model: MetaPermission, as: "permissions" }]
  });

  if (!permissionGroup) {
    throw new ApiError("Permission group not found", 404);
  }

  return sendSuccess(res, permissionGroup, "Permission group retrieved successfully");
});

/**
 * Get permissions for a specific permission group
 * GET /admin/permission-groups/:id/permissions
 */
export const getPermissionGroupPermissions = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const permissionGroup = await MetaPermissionGroup.findByPk(id, {
      include: [{ model: MetaPermission, as: "permissions" }]
    });

    if (!permissionGroup) {
      throw new ApiError("Permission group not found", 404);
    }

    return sendSuccess(res, permissionGroup.permissions, "Permissions retrieved successfully");
  }
);

/**
 * Create a new permission group
 * POST /admin/permission-groups
 */
export const createPermissionGroup = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    assertNoRestrictedFields(req.body);

    const { label, description } = req.body;
    const userId = req.user!.id;

    // Validate required fields
    if (!label) {
      throw new ApiError("Label is required", 400);
    }

    const permissionGroup = await MetaPermissionGroup.create({
      label,
      description,
      status: 1,
      createdBy: userId,
      updatedBy: userId
    });

    return sendSuccess(res, permissionGroup, "Permission group created successfully", 201);
  }
);

/**
 * Update a permission group
 * PUT /admin/permission-groups/:id
 */
export const updatePermissionGroup = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    assertNoRestrictedFields(req.body);

    const { label, description } = req.body;
    const userId = req.user!.id;

    const permissionGroup = await MetaPermissionGroup.findByPk(id);

    if (!permissionGroup) {
      throw new ApiError("Permission group not found", 404);
    }

    // Update fields
    if (label !== undefined) permissionGroup.label = label;
    if (description !== undefined) permissionGroup.description = description;
    permissionGroup.updatedBy = userId;

    await permissionGroup.save();

    return sendSuccess(res, permissionGroup, "Permission group updated successfully");
  }
);

/**
 * Delete a permission group
 * DELETE /admin/permission-groups/:id
 */
export const deletePermissionGroup = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const permissionGroup = await MetaPermissionGroup.findByPk(id, {
      include: [{ model: MetaPermission, as: "permissions" }]
    });

    if (!permissionGroup) {
      throw new ApiError("Permission group not found", 404);
    }

    // Check if group has permissions
    if (permissionGroup.permissions && permissionGroup.permissions.length > 0) {
      throw new ApiError(
        "Cannot delete permission group with associated permissions. Please delete or reassign permissions first.",
        400
      );
    }

    await permissionGroup.update({ status: 0 });

    return sendSuccess(res, null, "Permission group deleted successfully");
  }
);

/**
 * Soft delete (deactivate) a permission group
 * PATCH /admin/permission-groups/:id/deactivate
 */
export const deactivatePermissionGroup = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    const permissionGroup = await MetaPermissionGroup.findByPk(id);

    if (!permissionGroup) {
      throw new ApiError("Permission group not found", 404);
    }

    permissionGroup.status = 0;
    permissionGroup.updatedBy = userId;
    await permissionGroup.save();

    return sendSuccess(res, permissionGroup, "Permission group deactivated successfully");
  }
);

/**
 * Activate a permission group
 * PATCH /admin/permission-groups/:id/activate
 */
export const activatePermissionGroup = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    const permissionGroup = await MetaPermissionGroup.findByPk(id);

    if (!permissionGroup) {
      throw new ApiError("Permission group not found", 404);
    }

    permissionGroup.status = 1;
    permissionGroup.updatedBy = userId;
    await permissionGroup.save();

    return sendSuccess(res, permissionGroup, "Permission group activated successfully");
  }
);
