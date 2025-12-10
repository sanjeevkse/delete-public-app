import type { Request, Response } from "express";
import { Op } from "sequelize";
import type { Attributes, WhereOptions } from "sequelize";

import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { ApiError } from "../middlewares/errorHandler";
import Sidebar from "../models/Sidebar";
import MetaUserRole from "../models/MetaUserRole";
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
  const userRoleId =
    (req.query.userRoleId as string) ?? (req.query.user_role_id as string) ?? undefined;
  const status = req.query.status as string | undefined;

  if (dispName) {
    filters.push({ dispName: { [Op.like]: `%${dispName}%` } });
  }

  if (screenName) {
    filters.push({ screenName: { [Op.like]: `%${screenName}%` } });
  }

  if (userRoleId) {
    const parsedRoleId = Number.parseInt(userRoleId, 10);
    if (!Number.isNaN(parsedRoleId)) {
      filters.push({ userRoleId: parsedRoleId });
    }
  }

  if (status !== undefined) {
    const parsedStatus = Number.parseInt(status, 10);
    if (!Number.isNaN(parsedStatus)) {
      filters.push({ status: parsedStatus });
    }
  }

  return filters.length ? { [Op.and]: filters } : undefined;
};

const sidebarInclude = [
  {
    model: MetaUserRole,
    as: "userRole",
    attributes: ["id", "dispName", "description"]
  }
];

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
    include: sidebarInclude,
    limit,
    offset,
    order: [["createdAt", "DESC"]]
  });

  const pagination = calculatePagination(count, page, limit);
  return sendSuccessWithPagination(res, rows, pagination, "Sidebar entries retrieved successfully");
});

export const getSidebarItem = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const sidebar = await Sidebar.findByPk(id, { include: sidebarInclude });

  if (!sidebar) {
    return sendNotFound(res, "Sidebar entry not found", "sidebar");
  }

  return sendSuccess(res, sidebar, "Sidebar entry retrieved successfully");
});

export const createSidebarItem = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  assertNoRestrictedFields(req.body);

  const { dispName, screenName, userRoleId, icon } = req.body;
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

  const normalizedRoleId =
    userRoleId === undefined || userRoleId === null ? null : Number(userRoleId);
  if (normalizedRoleId !== null && Number.isNaN(normalizedRoleId)) {
    throw new ApiError("userRoleId must be a valid number", 400);
  }

  if (normalizedRoleId !== null) {
    const role = await MetaUserRole.findByPk(normalizedRoleId);
    if (!role) {
      throw new ApiError("Invalid userRoleId", 400);
    }
  }

  const newSidebar = await Sidebar.create({
    dispName,
    screenName: trimmedScreenName,
    userRoleId: normalizedRoleId,
    icon: icon ?? null,
    status: 1,
    createdBy: userId,
    updatedBy: userId
  });

  const createdSidebar = await Sidebar.findByPk(newSidebar.id, {
    include: sidebarInclude
  });

  return sendCreated(res, createdSidebar ?? newSidebar, "Sidebar entry created successfully");
});

export const updateSidebarItem = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  assertNoRestrictedFields(req.body, { allow: ["status"] });

  const { dispName, screenName, userRoleId, icon, status } = req.body;
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

  if (userRoleId !== undefined) {
    if (userRoleId === null) {
      sidebar.userRoleId = null;
    } else {
      const parsedRoleId = Number(userRoleId);
      if (Number.isNaN(parsedRoleId)) {
        throw new ApiError("userRoleId must be a valid number", 400);
      }
      const role = await MetaUserRole.findByPk(parsedRoleId);
      if (!role) {
        throw new ApiError("Invalid userRoleId", 400);
      }
      sidebar.userRoleId = parsedRoleId;
    }
  }

  if (icon !== undefined) {
    sidebar.icon = icon;
  }

  if (status !== undefined) {
    sidebar.status = status;
  }

  sidebar.updatedBy = userId;
  await sidebar.save();

  const updatedSidebar = await Sidebar.findByPk(id, { include: sidebarInclude });
  return sendSuccess(res, updatedSidebar ?? sidebar, "Sidebar entry updated successfully");
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
