import type { Request, Response } from "express";
import { Op } from "sequelize";
import type { Attributes, WhereOptions } from "sequelize";

import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { ApiError } from "../middlewares/errorHandler";
import ConditionalListItem from "../models/ConditionalListItem";
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
import { getUserAccessProfile } from "../services/rbacService";

const normalizePermissionsCsv = (input: unknown): string => {
  if (typeof input !== "string") {
    return "";
  }

  const parts = input
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  if (parts.length === 0) {
    return "";
  }

  return Array.from(new Set(parts)).join(",");
};

const parsePermissionsCsv = (input: string | null | undefined): string[] => {
  if (!input) {
    return [];
  }

  return input
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
};

const buildConditionalListWhereClause = (
  req: Request
): WhereOptions<Attributes<ConditionalListItem>> | undefined => {
  const filters: WhereOptions<Attributes<ConditionalListItem>>[] = [];
  const type = req.query.type as string | undefined;
  const name = req.query.name as string | undefined;
  const label = req.query.label as string | undefined;
  const status = req.query.status as string | undefined;

  if (type) {
    filters.push({ type });
  }

  if (name) {
    filters.push({ name: { [Op.like]: `%${name}%` } });
  }

  if (label) {
    filters.push({ label: { [Op.like]: `%${label}%` } });
  }

  if (status !== undefined) {
    const parsedStatus = Number.parseInt(status, 10);
    if (!Number.isNaN(parsedStatus)) {
      filters.push({ status: parsedStatus });
    }
  }

  return filters.length ? { [Op.and]: filters } : undefined;
};

export const listConditionalListItems = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = parsePaginationParams(
    req.query.page as string,
    req.query.limit as string,
    25,
    100
  );
  const where = buildConditionalListWhereClause(req);

  const { rows, count } = await ConditionalListItem.findAndCountAll({
    where,
    limit,
    offset,
    order: [["createdAt", "DESC"]]
  });

  const pagination = calculatePagination(count, page, limit);
  return sendSuccessWithPagination(res, rows, pagination, "Conditional list retrieved successfully");
});

export const getConditionalListItem = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const item = await ConditionalListItem.findByPk(id);
  if (!item) {
    return sendNotFound(res, "Conditional list item not found", "conditionalListItem");
  }

  return sendSuccess(res, item, "Conditional list item retrieved successfully");
});

export const createConditionalListItem = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    assertNoRestrictedFields(req.body);

    const { type, name, label, path, icon, status, permissions } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError("Authentication required", 401);
    }

    if (!type || !name || !label) {
      throw new ApiError("type, name, and label are required", 400);
    }

    const trimmedType = String(type).trim();
    const trimmedName = String(name).trim();

    const existing = await ConditionalListItem.findOne({
      where: { type: trimmedType, name: trimmedName }
    });
    if (existing) {
      throw new ApiError("type and name combination must be unique", 409);
    }

    const normalizedPermissions = normalizePermissionsCsv(permissions);

    const newItem = await ConditionalListItem.create({
      type: trimmedType,
      name: trimmedName,
      label,
      path: path ?? null,
      icon: icon ?? null,
      permissions: normalizedPermissions || null,
      status: status ?? 1,
      createdBy: userId,
      updatedBy: userId
    });

    return sendCreated(res, newItem, "Conditional list item created successfully");
  }
);

export const updateConditionalListItem = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    assertNoRestrictedFields(req.body, { allow: ["status"] });

    const { type, name, label, path, icon, status, permissions } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError("Authentication required", 401);
    }

    const item = await ConditionalListItem.findByPk(id);
    if (!item) {
      return sendNotFound(res, "Conditional list item not found", "conditionalListItem");
    }

    const nextType = type !== undefined ? String(type).trim() : item.type;
    const nextName = name !== undefined ? String(name).trim() : item.name;

    if (nextType !== item.type || nextName !== item.name) {
      const existing = await ConditionalListItem.findOne({
        where: {
          type: nextType,
          name: nextName,
          id: { [Op.ne]: item.id }
        }
      });
      if (existing) {
        throw new ApiError("type and name combination must be unique", 409);
      }
    }

    if (type !== undefined) {
      item.type = nextType;
    }
    if (name !== undefined) {
      item.name = nextName;
    }
    if (label !== undefined) {
      item.label = label;
    }
    if (path !== undefined) {
      item.path = path;
    }
    if (icon !== undefined) {
      item.icon = icon;
    }
    if (status !== undefined) {
      item.status = status;
    }
    if (permissions !== undefined) {
      const normalizedPermissions = normalizePermissionsCsv(permissions);
      item.permissions = normalizedPermissions || null;
    }

    item.updatedBy = userId;
    await item.save();

    return sendSuccess(res, item, "Conditional list item updated successfully");
  }
);

export const deleteConditionalListItem = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError("Authentication required", 401);
    }

    const item = await ConditionalListItem.findByPk(id);
    if (!item) {
      return sendNotFound(res, "Conditional list item not found", "conditionalListItem");
    }

    item.status = 0;
    item.updatedBy = userId;
    await item.save();

    return sendNoContent(res);
  }
);

export const listConditionalListItemsForUser = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError("Authentication required", 401);
    }

    const accessProfile = await getUserAccessProfile(userId);
    const permissionSet = new Set(accessProfile.permissions ?? []);

    const type = req.query.type as string | undefined;
    const where: WhereOptions<Attributes<ConditionalListItem>> = {
      status: 1
    };
    if (type) {
      where.type = type;
    }

    const items = await ConditionalListItem.findAll({
      where,
      order: [
        ["type", "ASC"],
        ["name", "ASC"]
      ]
    });

    const visible = items.filter((item) => {
      const perms = parsePermissionsCsv(item.permissions);
      if (perms.length === 0) {
        return true;
      }
      return perms.some((perm) => permissionSet.has(perm));
    });

    return sendSuccess(res, visible, "Conditional list retrieved successfully");
  }
);
