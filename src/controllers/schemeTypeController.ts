import type { Request, Response } from "express";
import { Op, type Order, type WhereOptions } from "sequelize";

import sequelize from "../config/database";
import { ApiError } from "../middlewares/errorHandler";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { requireAuthenticatedUser } from "../middlewares/authMiddleware";
import MetaSchemeType from "../models/MetaSchemeType";
import MetaSchemeTypeStep from "../models/MetaSchemeTypeStep";
import asyncHandler from "../utils/asyncHandler";
import {
  calculatePagination,
  sendCreated,
  sendNoContent,
  sendSuccess,
  sendSuccessWithPagination,
  sendValidationError
} from "../utils/apiResponse";

const PAGE_DEFAULT = 1;
const LIMIT_DEFAULT = 20;
const LIMIT_MAX = 100;

const SCHEME_TYPE_ATTRIBUTES = [
  "id",
  "dispName",
  "description",
  "status",
  "createdAt",
  "updatedAt"
] as const;
const STEP_ATTRIBUTES = [
  "id",
  "schemeTypeId",
  "stepOrder",
  "dispName",
  "description",
  "status",
  "createdAt",
  "updatedAt"
] as const;

type NormalizedSchemeTypePayload = {
  dispName?: string;
  description?: string | null;
  status?: number;
};

type NormalizedStepPayload = {
  stepOrder: number;
  dispName: string;
  description: string | null;
  status: number;
};

const parsePagination = (req: Request) => {
  const page = Number.parseInt((req.query.page as string) ?? `${PAGE_DEFAULT}`, 10);
  const limit = Number.parseInt((req.query.limit as string) ?? `${LIMIT_DEFAULT}`, 10);
  const safePage = Number.isNaN(page) || page <= 0 ? PAGE_DEFAULT : page;
  const safeLimit = Number.isNaN(limit) || limit <= 0 ? LIMIT_DEFAULT : Math.min(limit, LIMIT_MAX);
  return { page: safePage, limit: safeLimit, offset: (safePage - 1) * safeLimit };
};

const parseBooleanQuery = (value: unknown, defaultValue = false): boolean => {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "n"].includes(normalized)) {
      return false;
    }
  }
  return defaultValue;
};

const parseStatusFilter = (value: unknown): number | null | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value === "string" && value.trim().toLowerCase() === "all") {
    return null;
  }
  const numericValue = Number.parseInt(String(value), 10);
  if (!Number.isFinite(numericValue) || ![0, 1].includes(numericValue)) {
    throw new ApiError("status must be 0, 1, or 'all'", 400);
  }
  return numericValue;
};

const parseStatusValue = (value: unknown, field: string): number => {
  if (value === undefined || value === null || value === "") {
    return 1;
  }
  const numericValue = Number.parseInt(String(value), 10);
  if (!Number.isFinite(numericValue) || ![0, 1].includes(numericValue)) {
    throw new ApiError(`${field} must be 0 or 1`, 400);
  }
  return numericValue;
};

const normalizeSchemeTypePayload = (
  body: Record<string, unknown>,
  options: { partial?: boolean } = {}
): NormalizedSchemeTypePayload | null => {
  const { partial = false } = options;

  const dispNameValue = body.dispName ?? body.disp_name;
  const descriptionValue = body.description;
  const statusValue = body.status;

  if (
    partial &&
    dispNameValue === undefined &&
    descriptionValue === undefined &&
    statusValue === undefined
  ) {
    return null;
  }

  const normalized: NormalizedSchemeTypePayload = {};

  if (dispNameValue !== undefined) {
    if (typeof dispNameValue !== "string") {
      throw new ApiError("dispName must be a string", 400);
    }
    const trimmed = dispNameValue.trim();
    if (!trimmed) {
      throw new ApiError("dispName cannot be empty", 400);
    }
    if (trimmed.length > 255) {
      throw new ApiError("dispName must be at most 255 characters", 400);
    }
    normalized.dispName = trimmed;
  } else if (!partial) {
    throw new ApiError("dispName is required", 400);
  }

  if (descriptionValue !== undefined) {
    if (descriptionValue === null || descriptionValue === "") {
      normalized.description = null;
    } else if (typeof descriptionValue === "string") {
      normalized.description = descriptionValue.trim();
    } else {
      throw new ApiError("description must be a string", 400);
    }
  } else if (!partial) {
    normalized.description = null;
  }

  if (statusValue !== undefined) {
    normalized.status = parseStatusValue(statusValue, "status");
  } else if (!partial) {
    normalized.status = 1;
  }

  return normalized;
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

  return rawSteps.map((entry, index) => {
    if (typeof entry !== "object" || entry === null) {
      throw new ApiError("Each step must be an object", 400);
    }
    const record = entry as Record<string, unknown>;
    const dispNameValue = record.dispName ?? record.disp_name;
    if (typeof dispNameValue !== "string" || !dispNameValue.trim()) {
      throw new ApiError(`Step ${index + 1}: dispName is required`, 400);
    }

    const descriptionValue = record.description;
    let normalizedDescription: string | null = null;
    if (descriptionValue !== undefined) {
      if (descriptionValue === null || descriptionValue === "") {
        normalizedDescription = null;
      } else if (typeof descriptionValue === "string") {
        normalizedDescription = descriptionValue.trim();
      } else {
        throw new ApiError(`Step ${index + 1}: description must be a string`, 400);
      }
    }

    const stepOrderValue = record.stepOrder ?? record.step_order ?? index + 1;
    const parsedOrder = Number.parseInt(String(stepOrderValue), 10);
    if (!Number.isFinite(parsedOrder) || parsedOrder <= 0) {
      throw new ApiError(`Step ${index + 1}: stepOrder must be a positive number`, 400);
    }

    const statusValue = record.status;

    return {
      stepOrder: parsedOrder,
      dispName: dispNameValue.trim(),
      description: normalizedDescription,
      status: parseStatusValue(statusValue, `Step ${index + 1}: status`)
    };
  });
};

const buildStepsCreatePayload = (
  schemeTypeId: number,
  steps: NormalizedStepPayload[],
  userId: number
) =>
  steps.map((step) => ({
    schemeTypeId,
    stepOrder: step.stepOrder,
    dispName: step.dispName,
    description: step.description,
    status: step.status,
    createdBy: userId,
    updatedBy: userId
  }));

const includeStepsDefinition = (stepStatusFilter?: number | null) => ({
  association: "steps",
  attributes: [...STEP_ATTRIBUTES],
  where:
    stepStatusFilter === undefined || stepStatusFilter === null
      ? undefined
      : { status: stepStatusFilter },
  required: false,
  separate: true as const,
  order: [["stepOrder", "ASC"]] as Order
});

export const listSchemeTypes = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = parsePagination(req);
  const statusFilter = parseStatusFilter(req.query.status);
  const includeSteps = parseBooleanQuery(req.query.includeSteps ?? req.query.include_steps);
  const stepStatusFilter = parseStatusFilter(req.query.stepStatus ?? req.query.step_status);
  const search = (req.query.search as string | undefined)?.trim();

  const where: WhereOptions = {};
  if (statusFilter !== undefined) {
    if (statusFilter !== null) {
      where.status = statusFilter;
    }
  }

  if (search) {
    where.dispName = { [Op.like]: `%${search}%` };
  }

  const { rows, count } = await MetaSchemeType.findAndCountAll({
    where,
    attributes: [...SCHEME_TYPE_ATTRIBUTES],
    include: includeSteps ? [includeStepsDefinition(stepStatusFilter)] : undefined,
    limit,
    offset,
    order: [["dispName", "ASC"]],
    distinct: true
  });

  const pagination = calculatePagination(count, page, limit);

  return sendSuccessWithPagination(
    res,
    rows.map((row) => row.get({ plain: true })),
    pagination,
    rows.length ? "Scheme types fetched successfully" : "No scheme types found"
  );
});

export const getSchemeType = asyncHandler(async (req: Request, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw new ApiError("Invalid scheme type id", 400);
  }

  const includeSteps = parseBooleanQuery(req.query.includeSteps ?? "true", true);
  const stepStatusFilter = parseStatusFilter(req.query.stepStatus ?? req.query.step_status) ?? 1;

  const schemeType = await MetaSchemeType.findOne({
    where: { id },
    attributes: [...SCHEME_TYPE_ATTRIBUTES],
    include: includeSteps ? [includeStepsDefinition(stepStatusFilter)] : undefined
  });

  if (!schemeType) {
    throw new ApiError("Scheme type not found", 404);
  }

  return sendSuccess(res, schemeType.get({ plain: true }), "Scheme type fetched successfully");
});

export const createSchemeType = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);
  const body = req.body ?? {};
  const normalized = normalizeSchemeTypePayload(body);
  if (!normalized?.dispName) {
    throw new ApiError("dispName is required", 400);
  }
  const dispName = normalized.dispName as string;
  const stepsPayload =
    normalizeStepsPayload(body.steps ?? body.Steps ?? body.schemeTypeSteps, {
      allowUndefined: true
    }) ?? [];

  const schemeType = await sequelize.transaction(async (transaction) => {
    const createdSchemeType = await MetaSchemeType.create(
      {
        dispName,
        description: normalized.description ?? null,
        status: normalized.status ?? 1,
        createdBy: userId,
        updatedBy: userId
      },
      { transaction }
    );

    if (stepsPayload.length > 0) {
      await MetaSchemeTypeStep.bulkCreate(
        buildStepsCreatePayload(createdSchemeType.id, stepsPayload, userId),
        { transaction }
      );
    }

    return createdSchemeType;
  });

  return sendCreated(res, schemeType.get({ plain: true }), "Scheme type created successfully");
});

export const updateSchemeType = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);
  const schemeTypeId = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(schemeTypeId)) {
    throw new ApiError("Invalid scheme type id", 400);
  }

  const existing = await MetaSchemeType.findByPk(schemeTypeId);
  if (!existing) {
    throw new ApiError("Scheme type not found", 404);
  }

  const normalized = normalizeSchemeTypePayload(req.body ?? {}, { partial: true });
  const stepsPayload = normalizeStepsPayload(req.body?.steps ?? req.body?.schemeTypeSteps, {
    allowUndefined: true
  });

  if (!normalized && stepsPayload === undefined) {
    return sendValidationError(res, "Validation failed", [
      { field: "payload", message: "Provide fields to update" }
    ]);
  }

  const updated = await sequelize.transaction(async (transaction) => {
    if (normalized) {
      await existing.update(
        {
          ...(normalized.dispName !== undefined ? { dispName: normalized.dispName } : {}),
          ...(normalized.description !== undefined ? { description: normalized.description } : {}),
          ...(normalized.status !== undefined ? { status: normalized.status } : {}),
          updatedBy: userId
        },
        { transaction }
      );
    }

    if (stepsPayload !== undefined) {
      await MetaSchemeTypeStep.destroy({ where: { schemeTypeId }, transaction });
      if (stepsPayload.length > 0) {
        await MetaSchemeTypeStep.bulkCreate(
          buildStepsCreatePayload(schemeTypeId, stepsPayload, userId),
          { transaction }
        );
      }
    }

    await existing.reload({ transaction });
    return existing;
  });

  return sendSuccess(res, updated.get({ plain: true }), "Scheme type updated successfully");
});

export const deleteSchemeType = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);
  const schemeTypeId = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(schemeTypeId)) {
    throw new ApiError("Invalid scheme type id", 400);
  }

  const existing = await MetaSchemeType.findByPk(schemeTypeId);
  if (!existing) {
    throw new ApiError("Scheme type not found", 404);
  }

  await existing.update({ status: 0, updatedBy: userId });

  return sendNoContent(res);
});

export const updateSchemeTypeStep = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id: userId } = requireAuthenticatedUser(req);
    const schemeTypeId = Number.parseInt(req.params.schemeTypeId, 10);
    const stepId = Number.parseInt(req.params.stepId, 10);

    if (Number.isNaN(schemeTypeId) || Number.isNaN(stepId)) {
      throw new ApiError("Invalid scheme type or step id", 400);
    }

    const step = await MetaSchemeTypeStep.findOne({ where: { id: stepId, schemeTypeId } });
    if (!step) {
      throw new ApiError("Scheme type step not found", 404);
    }

    const body = req.body ?? {};
    const stepPayload = normalizeStepsPayload([{ ...body }]);
    const normalized = stepPayload?.[0];

    if (!normalized) {
      throw new ApiError("Invalid payload", 400);
    }

    await step.update({
      stepOrder: normalized.stepOrder,
      dispName: normalized.dispName,
      description: normalized.description,
      status: normalized.status,
      updatedBy: userId
    });

    return sendSuccess(res, step.get({ plain: true }), "Scheme type step updated successfully");
  }
);

export const deleteSchemeTypeStep = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id: userId } = requireAuthenticatedUser(req);
    const schemeTypeId = Number.parseInt(req.params.schemeTypeId, 10);
    const stepId = Number.parseInt(req.params.stepId, 10);

    if (Number.isNaN(schemeTypeId) || Number.isNaN(stepId)) {
      throw new ApiError("Invalid scheme type or step id", 400);
    }

    const step = await MetaSchemeTypeStep.findOne({ where: { id: stepId, schemeTypeId } });
    if (!step) {
      throw new ApiError("Scheme type step not found", 404);
    }

    await step.update({ status: 0, updatedBy: userId });

    return sendSuccess(res, step.get({ plain: true }), "Scheme type step deleted successfully");
  }
);
