import type { Request, Response } from "express";
import { Op, Transaction, type Attributes, type WhereOptions } from "sequelize";

import sequelize from "../config/database";
import { ApiError } from "../middlewares/errorHandler";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import MetaSchemeType from "../models/MetaSchemeType";
import MetaSchemeTypeStep from "../models/MetaSchemeTypeStep";
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

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

const SORTABLE_FIELDS = new Map<string, string>([
  ["createdAt", "createdAt"],
  ["updatedAt", "updatedAt"],
  ["dispName", "dispName"],
  ["status", "status"]
]);

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

const normalizeDispName = (value: unknown): string => {
  if (typeof value !== "string") {
    throw new ApiError("disp_name must be a string", 400);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new ApiError("disp_name cannot be empty", 400);
  }

  if (trimmed.length > 255) {
    throw new ApiError("disp_name must be at most 255 characters", 400);
  }

  return trimmed;
};

const normalizeDescription = (value: unknown): string => {
  if (typeof value !== "string") {
    throw new ApiError("description must be a string", 400);
  }

  return value.trim();
};

const normalizeNullableDescription = (value: unknown): string | null => {
  if (value === undefined || value === null) {
    return null;
  }

  return normalizeDescription(value);
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

const parseOptionalStatusValue = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === "" || value === "all") {
    return undefined;
  }

  return normalizeStatusValue(value);
};

const parseSortParams = (req: Request): { sortBy: string; direction: "ASC" | "DESC" } => {
  const rawSortBy = (req.query.sortBy as string) ?? (req.query.sort_by as string) ?? "createdAt";
  const rawOrder = (req.query.sortOrder as string) ?? (req.query.sort_order as string) ?? "DESC";

  const sortBy = SORTABLE_FIELDS.get(rawSortBy) ?? "createdAt";
  const normalizedOrder = rawOrder.toString().trim().toUpperCase();
  const direction: "ASC" | "DESC" = normalizedOrder === "ASC" ? "ASC" : "DESC";

  return { sortBy, direction };
};

const normalizeSchemeTypePayload = (
  body: Record<string, unknown>,
  options: { partial?: boolean } = {}
): NormalizedSchemeTypePayload => {
  const { partial = false } = options;

  const dispNameInput = body.dispName ?? body.disp_name;
  const descriptionInput = body.description;
  const statusInput = body.status;

  const payload: NormalizedSchemeTypePayload = {};

  if (!partial || dispNameInput !== undefined) {
    if (dispNameInput === undefined) {
      throw new ApiError("disp_name is required", 400);
    }
    payload.dispName = normalizeDispName(dispNameInput);
  }

  if (descriptionInput !== undefined) {
    payload.description = normalizeNullableDescription(descriptionInput);
  }

  if (!partial || statusInput !== undefined) {
    if (statusInput === undefined) {
      payload.status = 1;
    } else {
      payload.status = normalizeStatusValue(statusInput);
    }
  }

  return payload;
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
      throw new ApiError("step_order values must be unique within the scheme type", 400);
    }
    seenOrders.add(stepOrder);

    const dispNameInput = stepRecord.dispName ?? stepRecord.disp_name;
    if (dispNameInput === undefined) {
      throw new ApiError(`steps[${index}].disp_name is required`, 400);
    }
    const dispName = normalizeDispName(dispNameInput);

    const description = normalizeNullableDescription(stepRecord.description);

    const status =
      stepRecord.status === undefined ? 1 : normalizeStatusValue(stepRecord.status, "steps[].status");

    return {
      stepOrder,
      dispName,
      description,
      status
    };
  });
};

const serializeSchemeType = (schemeType: MetaSchemeType) => {
  const plain = schemeType.get({ plain: true }) as MetaSchemeType & {
    steps?: MetaSchemeTypeStep[];
  };

  const steps = Array.isArray(plain.steps) ? plain.steps : [];
  const sortedSteps = [...steps].sort((a, b) => a.stepOrder - b.stepOrder);

  return {
    id: plain.id,
    dispName: plain.dispName,
    description: plain.description ?? null,
    status: plain.status,
    createdBy: plain.createdBy ?? null,
    updatedBy: plain.updatedBy ?? null,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
    steps: sortedSteps.map((step) => ({
      id: step.id,
      schemeTypeId: step.schemeTypeId,
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

const withStepsInclude = {
  model: MetaSchemeTypeStep,
  as: "steps"
} as const;

export const listSchemeTypes = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = parsePaginationParams(
    req.query.page as string,
    req.query.limit as string,
    DEFAULT_LIMIT,
    MAX_LIMIT
  );

  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const statusFilter = parseOptionalStatusValue(req.query.status);
  const { sortBy, direction } = parseSortParams(req);

  const filters: WhereOptions<Attributes<MetaSchemeType>>[] = [];

  if (search) {
    const pattern = `%${search}%`;
    filters.push({
      [Op.or]: [{ dispName: { [Op.like]: pattern } }, { description: { [Op.like]: pattern } }]
    });
  }

  if (statusFilter !== undefined) {
    filters.push({ status: statusFilter });
  }

  const where: WhereOptions<Attributes<MetaSchemeType>> | undefined = filters.length
    ? { [Op.and]: filters }
    : undefined;

  const { rows, count } = await MetaSchemeType.findAndCountAll({
    where,
    limit,
    offset,
    distinct: true,
    include: [withStepsInclude],
    order: [
      [sortBy, direction],
      [{ model: MetaSchemeTypeStep, as: "steps" }, "stepOrder", "ASC"]
    ]
  });

  const pagination = calculatePagination(count, page, limit);

  sendSuccessWithPagination(
    res,
    rows.map(serializeSchemeType),
    pagination,
    "Scheme types retrieved successfully"
  );
});

export const getSchemeType = asyncHandler(async (req: Request, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw new ApiError("Invalid scheme type id", 400);
  }

  const schemeType = await MetaSchemeType.findOne({
    where: { id },
    include: [withStepsInclude],
    order: [[{ model: MetaSchemeTypeStep, as: "steps" }, "stepOrder", "ASC"]]
  });

  if (!schemeType) {
    return sendNotFound(res, "Scheme type not found");
  }

  sendSuccess(res, serializeSchemeType(schemeType), "Scheme type retrieved successfully");
});

export const createSchemeType = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const userId = req.user?.id ?? null;

    const payload = normalizeSchemeTypePayload(body);
    const stepsPayload = normalizeStepsPayload(body.steps, { allowUndefined: false }) ?? [];

    const existingType = await MetaSchemeType.findOne({
      where: { dispName: payload.dispName }
    });

    if (existingType) {
      throw new ApiError("A scheme type with this display name already exists", 409);
    }

    const createdSchemeType = await sequelize.transaction(
      async (transaction: Transaction): Promise<MetaSchemeType> => {
        const schemeType = await MetaSchemeType.create(
          {
            dispName: payload.dispName!,
            description: payload.description ?? null,
            status: payload.status ?? 1,
            createdBy: userId,
            updatedBy: userId
          },
          { transaction }
        );

        if (stepsPayload.length > 0) {
          await MetaSchemeTypeStep.bulkCreate(
            stepsPayload.map((step) => ({
              schemeTypeId: schemeType.id,
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

        await schemeType.reload({
          include: [withStepsInclude],
          order: [[{ model: MetaSchemeTypeStep, as: "steps" }, "stepOrder", "ASC"]],
          transaction
        });

        return schemeType;
      }
    );

    sendCreated(res, serializeSchemeType(createdSchemeType), "Scheme type created successfully");
  }
);

export const updateSchemeType = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      throw new ApiError("Invalid scheme type id", 400);
    }

    const schemeType = await MetaSchemeType.findByPk(id);
    if (!schemeType) {
      return sendNotFound(res, "Scheme type not found");
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const userId = req.user?.id ?? null;

    const payload = normalizeSchemeTypePayload(body, { partial: true });
    const stepsPayload = normalizeStepsPayload(body.steps, { allowUndefined: true });

    if (
      payload.dispName === undefined &&
      payload.description === undefined &&
      payload.status === undefined &&
      stepsPayload === undefined
    ) {
      throw new ApiError("No fields provided for update", 400);
    }

    if (payload.dispName && payload.dispName !== schemeType.dispName) {
      const existingType = await MetaSchemeType.findOne({
        where: {
          dispName: payload.dispName,
          id: { [Op.ne]: id }
        }
      });
      if (existingType) {
        throw new ApiError("A scheme type with this display name already exists", 409);
      }
    }

    const updatedSchemeType = await sequelize.transaction(
      async (transaction: Transaction): Promise<MetaSchemeType> => {
        const updates: Partial<MetaSchemeType> = {};

        if (payload.dispName !== undefined) {
          updates.dispName = payload.dispName;
        }
        if (payload.description !== undefined) {
          updates.description = payload.description;
        }
        if (payload.status !== undefined) {
          updates.status = payload.status;
        }

        if (Object.keys(updates).length > 0) {
          updates.updatedBy = userId;
          await schemeType.update(updates, { transaction });
        }

        if (stepsPayload !== undefined) {
          await MetaSchemeTypeStep.destroy({
            where: { schemeTypeId: schemeType.id },
            transaction
          });

          if (stepsPayload.length > 0) {
            await MetaSchemeTypeStep.bulkCreate(
              stepsPayload.map((step) => ({
                schemeTypeId: schemeType.id,
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

        await schemeType.reload({
          include: [withStepsInclude],
          order: [[{ model: MetaSchemeTypeStep, as: "steps" }, "stepOrder", "ASC"]],
          transaction
        });

        return schemeType;
      }
    );

    sendSuccess(res, serializeSchemeType(updatedSchemeType), "Scheme type updated successfully");
  }
);

export const deleteSchemeType = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw new ApiError("Invalid scheme type id", 400);
  }

  const schemeType = await MetaSchemeType.findByPk(id);
  if (!schemeType) {
    return sendNotFound(res, "Scheme type not found");
  }

  await sequelize.transaction(async (transaction: Transaction) => {
    await MetaSchemeTypeStep.destroy({
      where: { schemeTypeId: id },
      transaction
    });

    await schemeType.destroy({ transaction });
  });

  sendNoContent(res);
});

export const updateSchemeTypeStep = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const schemeTypeId = Number.parseInt(req.params.schemeTypeId, 10);
    const stepId = Number.parseInt(req.params.stepId, 10);

    if (Number.isNaN(schemeTypeId) || Number.isNaN(stepId)) {
      throw new ApiError("Invalid scheme type step id", 400);
    }

    const step = await MetaSchemeTypeStep.findOne({
      where: { id: stepId, schemeTypeId }
    });

    if (!step) {
      return sendNotFound(res, "Scheme type step not found");
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const userId = req.user?.id ?? null;

    const updates: Partial<MetaSchemeTypeStep> = {};

    if (body.stepOrder !== undefined || body.step_order !== undefined) {
      const stepOrder = Number.parseInt(String(body.stepOrder ?? body.step_order), 10);
      if (!Number.isFinite(stepOrder) || stepOrder <= 0) {
        throw new ApiError("step_order must be a positive integer", 400);
      }

      const conflictingStep = await MetaSchemeTypeStep.findOne({
        where: {
          schemeTypeId,
          stepOrder,
          id: { [Op.ne]: stepId }
        }
      });

      if (conflictingStep) {
        throw new ApiError("Another step with the same step_order already exists", 409);
      }

      updates.stepOrder = stepOrder;
    }

    if (body.dispName !== undefined || body.disp_name !== undefined) {
      updates.dispName = normalizeDispName(body.dispName ?? body.disp_name);
    }

    if (body.description !== undefined) {
      updates.description = normalizeNullableDescription(body.description);
    }

    if (body.status !== undefined) {
      updates.status = normalizeStatusValue(body.status);
    }

    if (Object.keys(updates).length === 0) {
      throw new ApiError("No fields provided for step update", 400);
    }

    updates.updatedBy = userId;

    await step.update(updates);

    sendSuccess(
      res,
      {
        id: step.id,
        schemeTypeId: step.schemeTypeId,
        stepOrder: step.stepOrder,
        dispName: step.dispName,
        description: step.description ?? null,
        status: step.status,
        createdBy: step.createdBy ?? null,
        updatedBy: step.updatedBy ?? null,
        createdAt: step.createdAt,
        updatedAt: step.updatedAt
      },
      "Scheme type step updated successfully"
    );
  }
);

export const deleteSchemeTypeStep = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const schemeTypeId = Number.parseInt(req.params.schemeTypeId, 10);
    const stepId = Number.parseInt(req.params.stepId, 10);

    if (Number.isNaN(schemeTypeId) || Number.isNaN(stepId)) {
      throw new ApiError("Invalid scheme type step id", 400);
    }

    const step = await MetaSchemeTypeStep.findOne({
      where: { id: stepId, schemeTypeId }
    });

    if (!step) {
      return sendNotFound(res, "Scheme type step not found");
    }

    await step.destroy();

    sendNoContent(res);
  }
);
