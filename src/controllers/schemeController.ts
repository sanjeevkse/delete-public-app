import type { Request, Response } from "express";
import { Op, Transaction, type WhereOptions } from "sequelize";

import sequelize from "../config/database";
import { ApiError } from "../middlewares/errorHandler";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { requireAuthenticatedUser } from "../middlewares/authMiddleware";
import Scheme from "../models/Scheme";
import SchemeStep from "../models/SchemeStep";
import MetaSchemeCategory from "../models/MetaSchemeCategory";
import MetaSchemeSector from "../models/MetaSchemeSector";
import notificationService from "../services/notificationService";
import asyncHandler from "../utils/asyncHandler";
import {
  sendCreated,
  sendNoContent,
  sendSuccess,
  sendSuccessWithPagination
} from "../utils/apiResponse";
import { buildQueryAttributes, shouldIncludeAuditFields } from "../utils/queryAttributes";
import { assertNoRestrictedFields } from "../utils/payloadValidation";

const PAGE_DEFAULT = 1;
const LIMIT_DEFAULT = 20;
const LIMIT_MAX = 100;

const SORTABLE_FIELDS = new Map<string, string>([
  ["createdAt", "createdAt"],
  ["updatedAt", "updatedAt"],
  ["status", "status"]
]);

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

  assertNoRestrictedFields(body);

  const dispNameInput =
    body.dispName ?? body.disp_name ?? (partial ? existing?.dispName : undefined);
  if (!partial || dispNameInput !== undefined) {
    if (dispNameInput === undefined) {
      throw new ApiError("disp_name is required", 400);
    }
  }

  const schemeCategoryIdInput =
    body.schemeCategoryId ??
    body.scheme_category_id ??
    (partial ? existing?.schemeCategoryId : undefined);

  const schemeSectorIdInput =
    body.schemeSectorId ??
    body.scheme_sector_id ??
    (partial ? existing?.schemeSectorId : undefined);

  const descriptionInput = body.description ?? (partial ? existing?.description : undefined);

  const normalized: {
    dispName?: string;
    description?: string | null;
    schemeCategoryId?: number | null;
    schemeSectorId?: number | null;
  } = {};

  if (dispNameInput !== undefined) {
    if (typeof dispNameInput !== "string") {
      throw new ApiError("disp_name must be a string", 400);
    }
    const trimmed = dispNameInput.trim();
    if (!trimmed) {
      throw new ApiError("disp_name cannot be empty", 400);
    }
    if (trimmed.length > 255) {
      throw new ApiError("disp_name must be at most 255 characters", 400);
    }
    normalized.dispName = trimmed;
  }

  if (descriptionInput !== undefined) {
    if (descriptionInput === null || descriptionInput === "") {
      normalized.description = null;
    } else if (typeof descriptionInput === "string") {
      normalized.description = descriptionInput.trim();
    } else {
      throw new ApiError("description must be a string", 400);
    }
  }

  if (schemeCategoryIdInput !== undefined) {
    if (schemeCategoryIdInput === null || schemeCategoryIdInput === "") {
      normalized.schemeCategoryId = null;
    } else {
      const categoryId = Number.parseInt(String(schemeCategoryIdInput), 10);
      if (Number.isNaN(categoryId) || categoryId <= 0) {
        throw new ApiError("scheme_category_id must be a valid positive number", 400);
      }
      normalized.schemeCategoryId = categoryId;
    }
  }

  if (schemeSectorIdInput !== undefined) {
    if (schemeSectorIdInput === null || schemeSectorIdInput === "") {
      normalized.schemeSectorId = null;
    } else {
      const sectorId = Number.parseInt(String(schemeSectorIdInput), 10);
      if (Number.isNaN(sectorId) || sectorId <= 0) {
        throw new ApiError("scheme_sector_id must be a valid positive number", 400);
      }
      normalized.schemeSectorId = sectorId;
    }
  }

  return normalized;
};

type NormalizedStepPayload = {
  stepOrder: number;
  dispName: string;
  description: string | null;
  status: number;
};

const normalizeStatusValue = (value: unknown, field: string = "status"): number => {
  if (value === undefined || value === null || value === "") {
    throw new ApiError(`${field} is required`, 400);
  }

  const numericValue = Number.parseInt(String(value), 10);

  if (!Number.isFinite(numericValue) || ![0, 1].includes(numericValue)) {
    throw new ApiError(`${field} must be 0 or 1`, 400);
  }

  return numericValue;
};

const normalizeStepsPayload = (
  rawSteps: unknown,
  options: { allowUndefined?: boolean } = {}
): NormalizedStepPayload[] | undefined => {
  const { allowUndefined = false } = options;

  if (rawSteps === undefined) {
    return allowUndefined ? undefined : [];
  }

  if (!Array.isArray(rawSteps)) {
    throw new ApiError("steps must be an array", 400);
  }

  const seenOrders = new Set<number>();

  return rawSteps.map((rawStep, index) => {
    if (rawStep === null || typeof rawStep !== "object") {
      throw new ApiError(`steps[${index}] must be an object`, 400);
    }

    const stepRecord = rawStep as Record<string, unknown>;

    const stepOrderInput = stepRecord.stepOrder ?? stepRecord.step_order;
    if (stepOrderInput === undefined) {
      throw new ApiError(`steps[${index}].step_order is required`, 400);
    }
    const stepOrder = Number.parseInt(String(stepOrderInput), 10);
    if (!Number.isFinite(stepOrder) || stepOrder <= 0) {
      throw new ApiError(`steps[${index}].step_order must be a positive integer`, 400);
    }

    if (seenOrders.has(stepOrder)) {
      throw new ApiError("step_order values must be unique within the scheme", 400);
    }
    seenOrders.add(stepOrder);

    const dispNameInput = stepRecord.dispName ?? stepRecord.disp_name;
    if (dispNameInput === undefined) {
      throw new ApiError(`steps[${index}].disp_name is required`, 400);
    }
    if (typeof dispNameInput !== "string") {
      throw new ApiError(`steps[${index}].disp_name must be a string`, 400);
    }
    const trimmed = dispNameInput.trim();
    if (!trimmed) {
      throw new ApiError(`steps[${index}].disp_name cannot be empty`, 400);
    }
    if (trimmed.length > 255) {
      throw new ApiError(`steps[${index}].disp_name must be at most 255 characters`, 400);
    }
    const dispName = trimmed;

    const descriptionInput = stepRecord.description;
    let description: string | null = null;
    if (descriptionInput !== undefined && descriptionInput !== null) {
      if (typeof descriptionInput !== "string") {
        throw new ApiError(`steps[${index}].description must be a string`, 400);
      }
      description = descriptionInput.trim();
    }

    return {
      stepOrder,
      dispName,
      description,
      status: 1
    };
  });
};

const withStepsInclude = {
  model: SchemeStep,
  as: "steps"
} as const;

const withCategoryInclude = {
  model: MetaSchemeCategory,
  as: "schemeCategory",
  attributes: ["id", "dispName", "description"]
};

const withSectorInclude = {
  model: MetaSchemeSector,
  as: "schemeSector",
  attributes: ["id", "dispName", "description"]
};

const serializeScheme = (scheme: Scheme) => {
  const plain = scheme.get({ plain: true }) as Scheme & {
    steps?: SchemeStep[];
    schemeCategory?: MetaSchemeCategory;
    schemeSector?: MetaSchemeSector;
  };

  const steps = Array.isArray(plain.steps) ? plain.steps : [];
  const sortedSteps = [...steps].sort((a, b) => a.stepOrder - b.stepOrder);

  return {
    id: plain.id,
    schemeCategoryId: plain.schemeCategoryId ?? null,
    schemeSectorId: plain.schemeSectorId ?? null,
    schemeCategory: plain.schemeCategory
      ? {
          id: plain.schemeCategory.id,
          dispName: plain.schemeCategory.dispName,
          description: plain.schemeCategory.description ?? null
        }
      : null,
    schemeSector: plain.schemeSector
      ? {
          id: plain.schemeSector.id,
          dispName: plain.schemeSector.dispName,
          description: plain.schemeSector.description ?? null
        }
      : null,
    dispName: plain.dispName,
    description: plain.description ?? null,
    status: plain.status,
    createdBy: plain.createdBy ?? null,
    updatedBy: plain.updatedBy ?? null,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
    steps: sortedSteps.map((step) => ({
      id: step.id,
      schemeId: step.schemeId,
      stepOrder: step.stepOrder,
      dispName: step.dispName,
      description: step.description ?? null,
      status: step.status,
      createdBy: step.createdBy ?? null,
      updatedBy: step.updatedBy ?? null,
      createdAt: step.createdAt,
      updatedAt: step.updatedAt
    }))
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
      dispName: { [Op.like]: pattern }
    });
  }

  const { rows, count } = await Scheme.findAndCountAll({
    where,
    attributes,
    limit,
    offset,
    distinct: true,
    include: [withStepsInclude, withCategoryInclude, withSectorInclude],
    order: [
      [sortBy, direction],
      [{ model: SchemeStep, as: "steps" }, "stepOrder", "ASC"]
    ]
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
    attributes,
    include: [withStepsInclude, withCategoryInclude, withSectorInclude],
    order: [[{ model: SchemeStep, as: "steps" }, "stepOrder", "ASC"]]
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
    dispName: string;
    description?: string | null;
    schemeCategoryId?: number | null;
    schemeSectorId?: number | null;
  };
  const stepsPayload = normalizeStepsPayload(body.steps, { allowUndefined: false }) ?? [];

  const createdScheme = await sequelize.transaction(
    async (transaction: Transaction): Promise<Scheme> => {
      const scheme = await Scheme.create(
        {
          schemeCategoryId: payload.schemeCategoryId ?? null,
          schemeSectorId: payload.schemeSectorId ?? null,
          dispName: payload.dispName,
          description: payload.description ?? null,
          status: 1,
          createdBy: userId,
          updatedBy: userId
        },
        { transaction }
      );

      if (stepsPayload.length > 0) {
        await SchemeStep.bulkCreate(
          stepsPayload.map((step) => ({
            schemeId: scheme.id,
            stepOrder: step.stepOrder,
            dispName: step.dispName,
            description: step.description,
            status: step.status,
            createdBy: userId,
            updatedBy: userId
          })),
          { transaction }
        );
      }

      await scheme.reload({
        include: [withStepsInclude, withCategoryInclude, withSectorInclude],
        order: [[{ model: SchemeStep, as: "steps" }, "stepOrder", "ASC"]],
        transaction
      });

      return scheme;
    }
  );

  // 🔥 Send notification to all users about the new scheme
  try {
    await notificationService.sendToAllUsers({
      title: `New Scheme: ${createdScheme.dispName}`,
      body:
        createdScheme.description ||
        `A new scheme "${createdScheme.dispName}" has been created. Check it out!`,
      data: {
        type: "scheme_created",
        schemeId: createdScheme.id.toString(),
        schemeName: createdScheme.dispName
      }
    });
    console.log(`✅ Notification sent for new scheme: ${createdScheme.dispName}`);
  } catch (notificationError) {
    // Don't fail scheme creation if notification fails
    console.error("⚠️ Failed to send scheme creation notification:", notificationError);
  }

  return sendCreated(res, serializeScheme(createdScheme), "Scheme created successfully");
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
  const stepsPayload = normalizeStepsPayload(body.steps, { allowUndefined: true });

  if (
    payload.dispName === undefined &&
    payload.description === undefined &&
    payload.schemeCategoryId === undefined &&
    payload.schemeSectorId === undefined &&
    stepsPayload === undefined
  ) {
    throw new ApiError("No fields provided for update", 400);
  }

  const updatedScheme = await sequelize.transaction(
    async (transaction: Transaction): Promise<Scheme> => {
      const updates: Record<string, unknown> = {};

      if (payload.dispName !== undefined) {
        updates.dispName = payload.dispName;
      }
      if (payload.description !== undefined) {
        updates.description = payload.description;
      }
      if (payload.schemeCategoryId !== undefined) {
        updates.schemeCategoryId = payload.schemeCategoryId;
      }
      if (payload.schemeSectorId !== undefined) {
        updates.schemeSectorId = payload.schemeSectorId;
      }

      if (Object.keys(updates).length > 0) {
        updates.updatedBy = userId;
        await scheme.update(updates, { transaction });
      }

      if (stepsPayload !== undefined) {
        // Soft delete existing steps by setting status to 0
        await SchemeStep.update(
          { status: 0, updatedBy: userId },
          {
            where: { schemeId: scheme.id },
            transaction
          }
        );

        if (stepsPayload.length > 0) {
          await SchemeStep.bulkCreate(
            stepsPayload.map((step) => ({
              schemeId: scheme.id,
              stepOrder: step.stepOrder,
              dispName: step.dispName,
              description: step.description,
              status: step.status,
              createdBy: userId,
              updatedBy: userId
            })),
            { transaction }
          );
        }
      }

      await scheme.reload({
        include: [withStepsInclude, withCategoryInclude, withSectorInclude],
        order: [[{ model: SchemeStep, as: "steps" }, "stepOrder", "ASC"]],
        transaction
      });

      return scheme;
    }
  );

  return sendSuccess(res, serializeScheme(updatedScheme), "Scheme updated successfully");
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

export const updateSchemeStep = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);

  const schemeId = Number.parseInt(req.params.schemeId, 10);
  const stepId = Number.parseInt(req.params.stepId, 10);

  if (Number.isNaN(schemeId)) {
    throw new ApiError("Invalid scheme id", 400);
  }
  if (Number.isNaN(stepId)) {
    throw new ApiError("Invalid step id", 400);
  }

  const step = await SchemeStep.findOne({
    where: { id: stepId, schemeId }
  });

  if (!step) {
    throw new ApiError("Scheme step not found", 404);
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  assertNoRestrictedFields(body);

  const updates: Record<string, unknown> = {};

  const stepOrderInput = body.stepOrder ?? body.step_order;
  if (stepOrderInput !== undefined) {
    const stepOrder = Number.parseInt(String(stepOrderInput), 10);
    if (!Number.isFinite(stepOrder) || stepOrder <= 0) {
      throw new ApiError("step_order must be a positive integer", 400);
    }

    if (stepOrder !== step.stepOrder) {
      const existingStep = await SchemeStep.findOne({
        where: {
          schemeId,
          stepOrder,
          id: { [Op.ne]: stepId }
        }
      });
      if (existingStep) {
        throw new ApiError("A step with this step_order already exists in this scheme", 409);
      }
    }
    updates.stepOrder = stepOrder;
  }

  const dispNameInput = body.dispName ?? body.disp_name;
  if (dispNameInput !== undefined) {
    if (typeof dispNameInput !== "string") {
      throw new ApiError("disp_name must be a string", 400);
    }
    const trimmed = dispNameInput.trim();
    if (!trimmed) {
      throw new ApiError("disp_name cannot be empty", 400);
    }
    if (trimmed.length > 255) {
      throw new ApiError("disp_name must be at most 255 characters", 400);
    }
    updates.dispName = trimmed;
  }

  const descriptionInput = body.description;
  if (descriptionInput !== undefined) {
    if (descriptionInput === null || descriptionInput === "") {
      updates.description = null;
    } else if (typeof descriptionInput === "string") {
      updates.description = descriptionInput.trim();
    } else {
      throw new ApiError("description must be a string", 400);
    }
  }

  const statusInput = body.status;
  if (statusInput !== undefined) {
    updates.status = normalizeStatusValue(statusInput);
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError("No fields provided for update", 400);
  }

  updates.updatedBy = userId;

  await step.update(updates);

  const serialized = {
    id: step.id,
    schemeId: step.schemeId,
    stepOrder: step.stepOrder,
    dispName: step.dispName,
    description: step.description ?? null,
    status: step.status,
    createdBy: step.createdBy ?? null,
    updatedBy: step.updatedBy ?? null,
    createdAt: step.createdAt,
    updatedAt: step.updatedAt
  };

  return sendSuccess(res, serialized, "Scheme step updated successfully");
});
