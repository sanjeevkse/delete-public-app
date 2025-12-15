import type { Request, Response } from "express";
import { Op } from "sequelize";
import type { Attributes, WhereOptions } from "sequelize";

import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { ApiError } from "../middlewares/errorHandler";
import Sidebar from "../models/Sidebar";
import asyncHandler from "../utils/asyncHandler";
import {
  calculatePagination,
  parsePaginationParams,
  sendCreated,
  sendNoContent,
  sendNotFound,
  sendSuccess,
  sendSuccessWithPagination
} from "../utils/apiResponse";
import { assertNoRestrictedFields } from "../utils/payloadValidation";

const buildSidebarWhereClause = (req: Request): WhereOptions<Attributes<Sidebar>> | undefined => {
  const filters: WhereOptions<Attributes<Sidebar>>[] = [];
  const dispName = (req.query.dispName as string) ?? (req.query.disp_name as string) ?? undefined;
  const screenName =
    (req.query.screenName as string) ?? (req.query.screen_name as string) ?? undefined;
  const status = req.query.status as string | undefined;

  if (dispName) {
    filters.push({ dispName: { [Op.like]: `%${dispName}%` } });
  }

  if (screenName) {
    filters.push({ screenName: { [Op.like]: `%${screenName}%` } });
  }

  if (status !== undefined) {
    const parsedStatus = Number.parseInt(status, 10);
    if (!Number.isNaN(parsedStatus)) {
      filters.push({ status: parsedStatus });
    }
  }

  return filters.length ? { [Op.and]: filters } : undefined;
};

export const listSidebarItems = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = parsePaginationParams(
    req.query.page as string,
    req.query.limit as string,
    25,
    100
  );
  const where = buildSidebarWhereClause(req);

  const { rows, count } = await Sidebar.findAndCountAll({
    where,
    limit,
    offset,
    order: [["createdAt", "DESC"]]
  });

  const pagination = calculatePagination(count, page, limit);
  return sendSuccessWithPagination(res, rows, pagination, "Sidebar entries retrieved successfully");
});

export const getSidebarItem = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const sidebar = await Sidebar.findByPk(id);

  if (!sidebar) {
    return sendNotFound(res, "Sidebar entry not found", "sidebar");
  }

  return sendSuccess(res, sidebar, "Sidebar entry retrieved successfully");
});

export const createSidebarItem = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  assertNoRestrictedFields(req.body);

  const { dispName, screenName, icon } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError("Authentication required", 401);
  }

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
    status: 1,
    createdBy: userId,
    updatedBy: userId
  });

  return sendCreated(res, newSidebar, "Sidebar entry created successfully");
});

export const updateSidebarItem = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  assertNoRestrictedFields(req.body, { allow: ["status"] });

  const { dispName, screenName, icon, status } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError("Authentication required", 401);
  }

  const sidebar = await Sidebar.findByPk(id);
  if (!sidebar) {
    return sendNotFound(res, "Sidebar entry not found", "sidebar");
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

  if (dispName !== undefined) {
    sidebar.dispName = dispName;
  }

  if (icon !== undefined) {
    sidebar.icon = icon;
  }

  if (status !== undefined) {
    sidebar.status = status;
  }

  sidebar.updatedBy = userId;
  await sidebar.save();

  return sendSuccess(res, sidebar, "Sidebar entry updated successfully");
});

export const deleteSidebarItem = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError("Authentication required", 401);
  }

  const sidebar = await Sidebar.findByPk(id);
  if (!sidebar) {
    return sendNotFound(res, "Sidebar entry not found", "sidebar");
  }

  sidebar.status = 0;
  sidebar.updatedBy = userId;
  await sidebar.save();

  return sendNoContent(res);
});

export const assignRoleToSidebar = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { sidebarId, roleId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError("Authentication required", 401);
    }

    const sidebar = await Sidebar.findByPk(sidebarId);
    if (!sidebar) {
      return sendNotFound(res, "Sidebar not found", "sidebar");
    }

    const { RoleSidebar } = await import("../models");
    const existing = await RoleSidebar.findOne({
      where: { sidebarId: parseInt(sidebarId as string), roleId: BigInt(roleId as string) }
    });

    if (existing) {
      return sendSuccess(res, existing, "Role already assigned to sidebar");
    }

    const roleSidebar = await RoleSidebar.create({
      sidebarId: parseInt(sidebarId as string),
      roleId: BigInt(roleId as string),
      status: 1,
      createdBy: BigInt(userId),
      updatedBy: BigInt(userId)
    });

    return sendCreated(res, roleSidebar, "Role assigned to sidebar successfully");
  }
);

export const removeRoleFromSidebar = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { sidebarId, roleId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError("Authentication required", 401);
    }

    const { RoleSidebar } = await import("../models");
    const rowsDeleted = await RoleSidebar.destroy({
      where: { sidebarId: parseInt(sidebarId as string), roleId: BigInt(roleId as string) }
    });

    if (rowsDeleted === 0) {
      return sendNotFound(res, "Role-sidebar mapping not found", "roleMapping");
    }

    return sendNoContent(res);
  }
);

export const assignPermissionGroupToSidebar = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { sidebarId, groupId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError("Authentication required", 401);
    }

    const sidebar = await Sidebar.findByPk(sidebarId);
    if (!sidebar) {
      return sendNotFound(res, "Sidebar not found", "sidebar");
    }

    const { PermissionGroupSidebar } = await import("../models");
    const existing = await PermissionGroupSidebar.findOne({
      where: {
        sidebarId: parseInt(sidebarId as string),
        permissionGroupId: BigInt(groupId as string)
      }
    });

    if (existing) {
      return sendSuccess(res, existing, "Permission group already assigned to sidebar");
    }

    const pgSidebar = await PermissionGroupSidebar.create({
      sidebarId: parseInt(sidebarId as string),
      permissionGroupId: BigInt(groupId as string),
      status: 1,
      createdBy: BigInt(userId),
      updatedBy: BigInt(userId)
    });

    return sendCreated(res, pgSidebar, "Permission group assigned to sidebar successfully");
  }
);

export const removePermissionGroupFromSidebar = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { sidebarId, groupId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError("Authentication required", 401);
    }

    const { PermissionGroupSidebar } = await import("../models");
    const rowsDeleted = await PermissionGroupSidebar.destroy({
      where: {
        sidebarId: parseInt(sidebarId as string),
        permissionGroupId: BigInt(groupId as string)
      }
    });

    if (rowsDeleted === 0) {
      return sendNotFound(res, "Permission-sidebar mapping not found", "groupMapping");
    }

    return sendNoContent(res);
  }
);
