import type { Response } from "express";
import { Op } from "sequelize";

import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import MetaPermissionGroup from "../models/MetaPermissionGroup";
import MetaPermission from "../models/MetaPermission";
import { ApiError } from "../middlewares/errorHandler";
import asyncHandler from "../utils/asyncHandler";
import { sendSuccess } from "../utils/apiResponse";
import { assertNoRestrictedFields } from "../utils/payloadValidation";

/**
 * List all permission groups
 * GET /admin/permission-groups
 */
export const listPermissionGroups = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { status, includePermissions } = req.query;

    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }

    const include =
      includePermissions === "true" ? [{ model: MetaPermission, as: "permissions" }] : [];

    const permissionGroups = await MetaPermissionGroup.findAll({
      where: whereClause,
      include,
      order: [["id", "ASC"]]
    });

    return sendSuccess(res, permissionGroups, "Permission groups retrieved successfully");
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

    const { label, description, sidebar, icon } = req.body;
    const userId = req.user!.id;

    // Validate required fields
    if (!label || !sidebar) {
      throw new ApiError("Label and sidebar are required", 400);
    }

    // Check if sidebar is unique
    const existingGroup = await MetaPermissionGroup.findOne({
      where: { sidebar }
    });

    if (existingGroup) {
      throw new ApiError("Sidebar value must be unique", 400);
    }

    const permissionGroup = await MetaPermissionGroup.create({
      label,
      description,
      sidebar,
      icon,
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

    const { label, description, sidebar, icon } = req.body;
    const userId = req.user!.id;

    const permissionGroup = await MetaPermissionGroup.findByPk(id);

    if (!permissionGroup) {
      throw new ApiError("Permission group not found", 404);
    }

    // If sidebar is being updated, check uniqueness
    if (sidebar && sidebar !== permissionGroup.sidebar) {
      const existingGroup = await MetaPermissionGroup.findOne({
        where: {
          sidebar,
          id: { [Op.ne]: id }
        }
      });

      if (existingGroup) {
        throw new ApiError("Sidebar value must be unique", 400);
      }
    }

    // Update fields
    if (label !== undefined) permissionGroup.label = label;
    if (description !== undefined) permissionGroup.description = description;
    if (sidebar !== undefined) permissionGroup.sidebar = sidebar;
    if (icon !== undefined) permissionGroup.icon = icon;
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
