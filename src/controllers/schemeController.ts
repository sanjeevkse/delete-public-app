import type { Request, Response } from "express";
import { Op, type WhereOptions } from "sequelize";

import { ApiError } from "../middlewares/errorHandler";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { requireAuthenticatedUser } from "../middlewares/authMiddleware";
import Scheme from "../models/Scheme";
import asyncHandler from "../utils/asyncHandler";
import {
  sendCreated,
  sendNoContent,
  sendSuccess,
  sendSuccessWithPagination
} from "../utils/apiResponse";
import { buildQueryAttributes, shouldIncludeAuditFields } from "../utils/queryAttributes";

const PAGE_DEFAULT = 1;
const LIMIT_DEFAULT = 20;
const LIMIT_MAX = 100;

const SORTABLE_FIELDS = new Map<string, string>([
  ["createdAt", "createdAt"],
  ["updatedAt", "updatedAt"],
  ["schemeName", "schemeName"],
  ["status", "status"]
]);

const normalizeString = (value: unknown, field: string): string => {
  if (typeof value !== "string") {
    throw new ApiError(`${field} is required`, 400);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new ApiError(`${field} cannot be empty`, 400);
  }

  if (trimmed.length > 191 && field === "scheme_name") {
    throw new ApiError(`${field} must be at most 191 characters`, 400);
  }

  return trimmed;
};

const normalizeDescription = (value: unknown): string => {
  if (typeof value !== "string") {
    throw new ApiError("description is required", 400);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new ApiError("description cannot be empty", 400);
  }

  return trimmed;
};

const parseOptionalStatus = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const numericValue = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(numericValue) || ![0, 1].includes(numericValue)) {
    throw new ApiError("status must be 0 or 1", 400);
  }

  return numericValue;
};

const parseStatusFilter = (value: unknown): number | null | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "string" && value.trim().toLowerCase() === "all") {
    return null;
  }

  return parseOptionalStatus(value) ?? undefined;
};

const parsePagination = (req: Request) => {
  const page = Number.parseInt((req.query.page as string) ?? `${PAGE_DEFAULT}`, 10);
  const limit = Number.parseInt((req.query.limit as string) ?? `${LIMIT_DEFAULT}`, 10);

  const safePage = Number.isNaN(page) || page <= 0 ? PAGE_DEFAULT : page;
  const safeLimit = Number.isNaN(limit) || limit <= 0 ? LIMIT_DEFAULT : Math.min(limit, LIMIT_MAX);

  return {
    page: safePage,
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit
  };
};

const parseSort = (req: Request) => {
  const rawSortBy = (req.query.sortBy as string) ?? (req.query.sort_by as string) ?? "createdAt";
  const rawOrder = (req.query.sortOrder as string) ?? (req.query.sort_order as string) ?? "DESC";

  const sortBy = SORTABLE_FIELDS.get(rawSortBy) ?? "createdAt";

  const normalizedOrder = rawOrder.toString().trim().toUpperCase();
  const direction: "ASC" | "DESC" = normalizedOrder === "ASC" ? "ASC" : "DESC";

  return { sortBy, direction };
};

const normalizeSchemePayload = (
  body: Record<string, unknown>,
  options: { existing?: Scheme | null; partial?: boolean } = {}
) => {
  const { existing, partial = false } = options;

  const schemeNameInput =
    body.schemeName ?? body.scheme_name ?? (partial ? existing?.schemeName : undefined);
  if (!partial || schemeNameInput !== undefined) {
    if (schemeNameInput === undefined) {
      throw new ApiError("scheme_name is required", 400);
    }
  }

  const descriptionInput = body.description ?? (partial ? existing?.description : undefined);
  if (!partial || descriptionInput !== undefined) {
    if (descriptionInput === undefined) {
      throw new ApiError("description is required", 400);
    }
  }

  const normalized: {
    schemeName?: string;
    description?: string;
    status?: number;
  } = {};

  if (schemeNameInput !== undefined) {
    normalized.schemeName = normalizeString(schemeNameInput, "scheme_name");
  }

  if (descriptionInput !== undefined) {
    normalized.description = normalizeDescription(descriptionInput);
  }

  const statusInput = body.status ?? (partial ? existing?.status : undefined);
  if (statusInput !== undefined) {
    const parsedStatus = parseOptionalStatus(statusInput);
    if (parsedStatus !== undefined) {
      normalized.status = parsedStatus;
    }
  }

  return normalized;
};

const serializeScheme = (scheme: Scheme) => {
  const plain = scheme.get({ plain: true });

  return {
    id: plain.id,
    schemeName: plain.schemeName,
    description: plain.description,
    status: plain.status,
    createdBy: plain.createdBy ?? null,
    updatedBy: plain.updatedBy ?? null,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt
  };
};

export const listSchemes = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  requireAuthenticatedUser(req);

  const { page, limit, offset } = parsePagination(req);
  const { sortBy, direction } = parseSort(req);
  const statusFilter = parseStatusFilter(req.query.status);
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

  const includeAuditFields = shouldIncludeAuditFields(req.query);
  const attributes = buildQueryAttributes({ includeAuditFields, keepFields: [sortBy] });

  const where: WhereOptions = {};

  if (statusFilter === undefined) {
    where.status = 1;
  } else if (statusFilter !== null) {
    where.status = statusFilter;
  }

  if (search) {
    const pattern = `%${search}%`;
    Object.assign(where, {
      [Op.or]: [{ schemeName: { [Op.like]: pattern } }, { description: { [Op.like]: pattern } }]
    });
  }

  const { rows, count } = await Scheme.findAndCountAll({
    where,
    attributes,
    limit,
    offset,
    order: [[sortBy, direction]]
  });

  const totalPages = limit > 0 ? Math.ceil(count / limit) : 0;

  return sendSuccessWithPagination(
    res,
    rows.map(serializeScheme),
    {
      page,
      limit,
      total: count,
      totalPages
    },
    "Schemes retrieved successfully"
  );
});

export const getScheme = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  requireAuthenticatedUser(req);

  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw new ApiError("Invalid scheme id", 400);
  }

  const includeAuditFields = shouldIncludeAuditFields(req.query);
  const attributes = buildQueryAttributes({ includeAuditFields });

  const scheme = await Scheme.findOne({
    where: { id, status: 1 },
    attributes
  });

  if (!scheme) {
    throw new ApiError("Scheme not found", 404);
  }

  return sendSuccess(res, serializeScheme(scheme), "Scheme details retrieved successfully");
});

export const createScheme = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);

  const body = (req.body ?? {}) as Record<string, unknown>;
  const payload = normalizeSchemePayload(body, { partial: false }) as {
    schemeName: string;
    description: string;
    status?: number;
  };

  const created = await Scheme.create({
    schemeName: payload.schemeName,
    description: payload.description,
    status: payload.status ?? 1,
    createdBy: userId,
    updatedBy: userId
  });

  return sendCreated(res, serializeScheme(created), "Scheme created successfully");
});

export const updateScheme = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);

  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw new ApiError("Invalid scheme id", 400);
  }

  const scheme = await Scheme.findByPk(id);
  if (!scheme) {
    throw new ApiError("Scheme not found", 404);
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const payload = normalizeSchemePayload(body, { existing: scheme, partial: true });

  if (
    payload.schemeName === undefined &&
    payload.description === undefined &&
    payload.status === undefined
  ) {
    throw new ApiError("No fields provided for update", 400);
  }

  const updates: Record<string, unknown> = {};

  if (payload.schemeName !== undefined) {
    updates.schemeName = payload.schemeName;
  }
  if (payload.description !== undefined) {
    updates.description = payload.description;
  }
  if (payload.status !== undefined) {
    updates.status = payload.status;
  }

  updates.updatedBy = userId;

  await scheme.update(updates);

  return sendSuccess(res, serializeScheme(scheme), "Scheme updated successfully");
});

export const deleteScheme = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);

  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw new ApiError("Invalid scheme id", 400);
  }

  const scheme = await Scheme.findOne({
    where: { id, status: 1 }
  });

  if (!scheme) {
    throw new ApiError("Scheme not found", 404);
  }

  await scheme.update({
    status: 0,
    updatedBy: userId
  });

  return sendNoContent(res);
});
