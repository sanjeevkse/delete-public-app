import { Router } from "express";
import type { Request, Response } from "express";
import Sidebar from "../models/Sidebar";
import { Op } from "sequelize";
import asyncHandler from "../utils/asyncHandler";
import {
  sendCreated,
  sendNoContent,
  sendNotFound,
  sendSuccess,
  sendSuccessWithPagination,
  calculatePagination,
  parsePaginationParams
} from "../utils/apiResponse";
import { ApiError } from "../middlewares/errorHandler";

const router = Router();

// GET all sidebar items for view
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { page = "1", limit = "100" } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 100));
    const offset = (pageNum - 1) * limitNum;

    const { rows, count } = await Sidebar.findAndCountAll({
      limit: limitNum,
      offset,
      order: [["createdAt", "DESC"]]
    });

    const pagination = calculatePagination(count, pageNum, limitNum);
    return sendSuccessWithPagination(res, rows, pagination, "Sidebar entries retrieved");
  })
);

// GET single sidebar item for view
router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const sidebar = await Sidebar.findByPk(id);

    if (!sidebar) {
      return sendNotFound(res, "Sidebar entry not found", "sidebar");
    }

    return sendSuccess(res, sidebar, "Sidebar entry retrieved");
  })
);

// POST create sidebar item for view
router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { dispName, screenName, icon, status } = req.body;

    if (!dispName || !screenName) {
      throw new ApiError("dispName and screenName are required", 400);
    }

    const trimmedScreenName = screenName.trim();
    const existing = await Sidebar.findOne({ where: { screenName: trimmedScreenName } });
    if (existing) {
      throw new ApiError("screenName must be unique", 409);
    }

    const newSidebar = await Sidebar.create({
      dispName,
      screenName: trimmedScreenName,
      icon: icon ?? null,
      status: status ?? 1,
      createdBy: 1,
      updatedBy: 1
    });

    return sendCreated(res, newSidebar, "Sidebar entry created");
  })
);

// PUT update sidebar item for view
router.put(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { dispName, screenName, icon, status } = req.body;

    const sidebar = await Sidebar.findByPk(id);
    if (!sidebar) {
      return sendNotFound(res, "Sidebar entry not found", "sidebar");
    }

    if (dispName !== undefined) {
      sidebar.dispName = dispName;
    }

    if (screenName && screenName.trim() !== sidebar.screenName) {
      const trimmedScreenName = screenName.trim();
      const existing = await Sidebar.findOne({
        where: {
          screenName: trimmedScreenName,
          id: { [Op.ne]: sidebar.id }
        }
      });

      if (existing) {
        throw new ApiError("screenName must be unique", 409);
      }

      sidebar.screenName = trimmedScreenName;
    }

    if (icon !== undefined) {
      sidebar.icon = icon;
    }

    if (status !== undefined) {
      sidebar.status = status;
    }

    sidebar.updatedBy = 1;
    await sidebar.save();

    return sendSuccess(res, sidebar, "Sidebar entry updated");
  })
);

// DELETE sidebar item for view
router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const sidebar = await Sidebar.findByPk(id);
    if (!sidebar) {
      return sendNotFound(res, "Sidebar entry not found", "sidebar");
    }
    sidebar.status = 0;
    sidebar.updatedBy = 1;
    await sidebar.save();

    return sendNoContent(res);
  })
);

// POST assign role to sidebar (role-based access)
router.post(
  "/:sidebarId/roles/:roleId",
  asyncHandler(async (req: Request, res: Response) => {
    const { sidebarId, roleId } = req.params;

    const sidebar = await Sidebar.findByPk(sidebarId);
    if (!sidebar) {
      return sendNotFound(res, "Sidebar not found", "sidebar");
    }

    const { RoleSidebar } = await import("../models");
    const existing = await RoleSidebar.findOne({
      where: { sidebarId: parseInt(sidebarId), roleId: BigInt(roleId) }
    });

    if (existing) {
      return sendSuccess(res, existing, "Role already assigned to sidebar");
    }

    const roleSidebar = await RoleSidebar.create({
      sidebarId: parseInt(sidebarId),
      roleId: BigInt(roleId),
      status: 1,
      createdBy: 1,
      updatedBy: 1
    });

    return sendCreated(res, roleSidebar, "Role assigned to sidebar");
  })
);

// DELETE remove role from sidebar
router.delete(
  "/:sidebarId/roles/:roleId",
  asyncHandler(async (req: Request, res: Response) => {
    const { sidebarId, roleId } = req.params;

    const { RoleSidebar } = await import("../models");
    const rowsDeleted = await RoleSidebar.destroy({
      where: { sidebarId: parseInt(sidebarId), roleId: BigInt(roleId) }
    });

    if (rowsDeleted === 0) {
      return sendNotFound(res, "Role-sidebar mapping not found", "roleMapping");
    }

    return sendNoContent(res);
  })
);

// POST assign permission group to sidebar (permission-based access)
router.post(
  "/:sidebarId/permission-groups/:groupId",
  asyncHandler(async (req: Request, res: Response) => {
    const { sidebarId, groupId } = req.params;

    const sidebar = await Sidebar.findByPk(sidebarId);
    if (!sidebar) {
      return sendNotFound(res, "Sidebar not found", "sidebar");
    }

    const { PermissionGroupSidebar } = await import("../models");
    const existing = await PermissionGroupSidebar.findOne({
      where: { sidebarId: parseInt(sidebarId), permissionGroupId: BigInt(groupId) }
    });

    if (existing) {
      return sendSuccess(res, existing, "Permission group already assigned to sidebar");
    }

    const pgSidebar = await PermissionGroupSidebar.create({
      sidebarId: parseInt(sidebarId),
      permissionGroupId: BigInt(groupId),
      status: 1,
      createdBy: 1,
      updatedBy: 1
    });

    return sendCreated(res, pgSidebar, "Permission group assigned to sidebar");
  })
);

// DELETE remove permission group from sidebar
router.delete(
  "/:sidebarId/permission-groups/:groupId",
  asyncHandler(async (req: Request, res: Response) => {
    const { sidebarId, groupId } = req.params;

    const { PermissionGroupSidebar } = await import("../models");
    const rowsDeleted = await PermissionGroupSidebar.destroy({
      where: { sidebarId: parseInt(sidebarId), permissionGroupId: BigInt(groupId) }
    });

    if (rowsDeleted === 0) {
      return sendNotFound(res, "Permission-sidebar mapping not found", "groupMapping");
    }

    return sendNoContent(res);
  })
);

export default router;
