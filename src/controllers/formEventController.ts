import type { Response } from "express";
import { Op, Transaction, type Model, type ModelStatic } from "sequelize";

import asyncHandler from "../utils/asyncHandler";
import { ApiError } from "../middlewares/errorHandler";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { requireAuthenticatedUser } from "../middlewares/authMiddleware";
import {
  calculatePagination,
  parsePaginationParams,
  parseSortDirection,
  sendCreated,
  sendSuccess,
  sendSuccessWithPagination,
  validateSortColumn
} from "../utils/apiResponse";
import { assertNoRestrictedFields } from "../utils/payloadValidation";
import FormEvent from "../models/FormEvent";
import Form from "../models/Form";
import FormField from "../models/FormField";
import FormFieldOption from "../models/FormFieldOption";
import FormEventAccessibility from "../models/FormEventAccessibility";
import sequelize from "../config/database";
import {
  buildAccessibilityInclude,
  validateAccessibilityPayload,
  ensureAccessibilityReferencesExist,
  type AccessibilityPayload
} from "../services/accessibilityService";
import { buildAccessibilityFilter } from "../services/userHierarchyService";

const DEFAULT_SORT_COLUMNS = ["startDate", "endDate", "createdAt", "title"];

const getBaseIncludes = () => [
  buildAccessibilityInclude(),
  {
    model: Form,
    as: "form",
    include: [
      {
        model: FormField,
        as: "fields",
        include: [
          {
            model: FormFieldOption,
            as: "options"
          }
        ]
      }
    ]
  }
];

const ensureNumber = (value: unknown, field: string): number => {
  if (value === undefined || value === null || value === "") {
    throw new ApiError(`${field} is required`, 400);
  }
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw new ApiError(`Invalid ${field}`, 400);
  }
  return num;
};

const ensureNonEmptyString = (value: unknown, field: string): string => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ApiError(`${field} is required`, 400);
  }
  return value.trim();
};

const ensureDateOnly = (value: unknown, field: string): string => {
  if (value === undefined || value === null || value === "") {
    throw new ApiError(`${field} is required`, 400);
  }

  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(`Invalid ${field}`, 400);
  }

  return date.toISOString().slice(0, 10);
};

const ensureOptionalDateOnly = (value: unknown, field: string): string | null => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(`Invalid ${field}`, 400);
  }

  return date.toISOString().slice(0, 10);
};

const toDateOnlyString = (value: unknown): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return undefined;
};

const parseAccessibilityPayload = (value: unknown): AccessibilityPayload[] => {
  return validateAccessibilityPayload(value);
};

const ensureFormExists = async (formId: number): Promise<void> => {
  const form = await Form.findByPk(formId);
  if (!form) {
    throw new ApiError("Form not found", 404);
  }
};

const ensureAccessibilityReferences = async (records: AccessibilityPayload[]): Promise<void> => {
  return ensureAccessibilityReferencesExist(records);
};

const loadFormEventOrThrow = async (id: string | number): Promise<FormEvent> => {
  const event = await FormEvent.findByPk(id);
  if (!event) {
    throw new ApiError("Form event not found", 404);
  }
  return event;
};

const ensureValidDateRange = (startDate: string, endDate: string | null): void => {
  if (endDate && endDate < startDate) {
    throw new ApiError("endDate cannot be earlier than startDate", 400);
  }
};

const replaceAccessibility = async (
  transaction: Transaction,
  formEventId: number,
  userId: number,
  payload: AccessibilityPayload[]
): Promise<void> => {
  await FormEventAccessibility.destroy({
    where: { formEventId },
    transaction
  });

  await FormEventAccessibility.bulkCreate(
    payload.map((item) => ({
      formEventId,
      wardNumberId: item.wardNumberId,
      boothNumberId: item.boothNumberId,
      userRoleId: item.userRoleId,
      status: 1,
      createdBy: userId,
      updatedBy: userId
    })),
    { transaction }
  );
};

export const listFormEvents = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);

  const { page, limit, offset } = parsePaginationParams(
    req.query.page as string | undefined,
    req.query.limit as string | undefined,
    20,
    100
  );
  const sortDirection = parseSortDirection(req.query.sort as string | undefined, "DESC");
  const sortColumn = validateSortColumn(req.query.sortColumn, DEFAULT_SORT_COLUMNS, "startDate");

  const where: Record<string, unknown> = {};
  const { status, formId, search, startDateFrom, startDateTo } = req.query;

  if (status !== undefined) {
    where.status = ensureNumber(status, "status");
  }

  if (formId !== undefined) {
    where.formId = ensureNumber(formId, "formId");
  }

  if (search && typeof search === "string" && search.trim()) {
    where.title = { [Op.like]: `%${search.trim()}%` };
  }

  if (startDateFrom && startDateTo) {
    where.startDate = {
      [Op.between]: [
        ensureDateOnly(startDateFrom, "startDateFrom"),
        ensureDateOnly(startDateTo, "startDateTo")
      ]
    };
  } else if (startDateFrom) {
    where.startDate = {
      [Op.gte]: ensureDateOnly(startDateFrom, "startDateFrom")
    };
  } else if (startDateTo) {
    where.startDate = {
      [Op.lte]: ensureDateOnly(startDateTo, "startDateTo")
    };
  }

  // Build accessibility filter for geographic zones (geo-boundary only)
  const accessibilityFilter = await buildAccessibilityFilter(userId);

  // Build include with accessibility filtering
  const includes = getBaseIncludes();
  if (accessibilityFilter) {
    const accessibilityInclude = includes[0] as any;
    accessibilityInclude.where = accessibilityFilter;
    accessibilityInclude.required = true; // INNER JOIN - only return events with matching accessibility
  }

  const { rows, count } = await FormEvent.findAndCountAll({
    where,
    include: includes,
    distinct: true,
    limit,
    offset,
    order: [[sortColumn, sortDirection]]
  });

  const pagination = calculatePagination(count, page, limit);

  return sendSuccessWithPagination(res, rows, pagination, "Form events fetched successfully");
});

export const getFormEvent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const event = await FormEvent.findByPk(id, {
    include: getBaseIncludes()
  });

  if (!event) {
    throw new ApiError("Form event not found", 404);
  }

  return sendSuccess(res, event, "Form event retrieved successfully");
});

export const createFormEvent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  assertNoRestrictedFields(req.body);
  const { id: userId } = requireAuthenticatedUser(req);
  const { formId, title, description, startDate, endDate, accessibility } = req.body;

  const normalizedFormId = ensureNumber(formId, "formId");
  const normalizedTitle = ensureNonEmptyString(title, "title");
  const normalizedDescription = ensureNonEmptyString(description, "description");
  const normalizedStartDate = ensureDateOnly(startDate, "startDate");
  const normalizedEndDate = ensureOptionalDateOnly(endDate, "endDate");
  ensureValidDateRange(normalizedStartDate, normalizedEndDate);

  await ensureFormExists(normalizedFormId);

  const accessibilityPayload = parseAccessibilityPayload(accessibility);
  await ensureAccessibilityReferences(accessibilityPayload);

  const created = await sequelize.transaction(async (transaction) => {
    const event = await FormEvent.create(
      {
        formId: normalizedFormId,
        title: normalizedTitle,
        description: normalizedDescription,
        startDate: normalizedStartDate,
        endDate: normalizedEndDate,
        status: 1,
        createdBy: userId,
        updatedBy: userId
      },
      { transaction }
    );

    await FormEventAccessibility.bulkCreate(
      accessibilityPayload.map((item) => ({
        formEventId: event.id,
        wardNumberId: item.wardNumberId,
        boothNumberId: item.boothNumberId,
        userRoleId: item.userRoleId,
        status: 1,
        createdBy: userId,
        updatedBy: userId
      })),
      { transaction }
    );

    return event;
  });

  const fresh = await FormEvent.findByPk(created.id, {
    include: getBaseIncludes()
  });

  return sendCreated(res, fresh, "Form event created successfully");
});

export const updateFormEvent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  assertNoRestrictedFields(req.body, { allow: ["status"] });
  const { id } = req.params;
  const { id: userId } = requireAuthenticatedUser(req);
  const { formId, title, description, startDate, endDate, status, accessibility } = req.body;

  const event = await loadFormEventOrThrow(id);

  const updates: Record<string, unknown> = {};

  if (formId !== undefined) {
    const normalizedFormId = ensureNumber(formId, "formId");
    await ensureFormExists(normalizedFormId);
    updates.formId = normalizedFormId;
  }
  if (title !== undefined) {
    updates.title = ensureNonEmptyString(title, "title");
  }
  if (description !== undefined) {
    updates.description = ensureNonEmptyString(description, "description");
  }
  let normalizedStartDate: string | undefined;
  if (startDate !== undefined) {
    normalizedStartDate = ensureDateOnly(startDate, "startDate");
    updates.startDate = normalizedStartDate;
  }

  let normalizedEndDate: string | null | undefined;
  if (endDate !== undefined) {
    normalizedEndDate = ensureOptionalDateOnly(endDate, "endDate");
    updates.endDate = normalizedEndDate;
  }

  if (status !== undefined) {
    const nextStatus = ensureNumber(status, "status");
    if (![0, 1].includes(nextStatus)) {
      throw new ApiError("status must be 0 or 1", 400);
    }
    updates.status = nextStatus;
  }

  const currentStart = toDateOnlyString(event.getDataValue("startDate"));
  const currentEnd = toDateOnlyString(event.getDataValue("endDate"));
  const futureStartDate = normalizedStartDate ?? currentStart;
  const futureEndDate = normalizedEndDate !== undefined ? normalizedEndDate : (currentEnd ?? null);

  if (futureStartDate) {
    ensureValidDateRange(futureStartDate, futureEndDate ?? null);
  }

  let accessibilityPayload: AccessibilityPayload[] | undefined;
  if (accessibility !== undefined) {
    accessibilityPayload = parseAccessibilityPayload(accessibility);
    await ensureAccessibilityReferences(accessibilityPayload);
  }

  await sequelize.transaction(async (transaction) => {
    if (Object.keys(updates).length > 0) {
      await event.update(
        {
          ...updates,
          updatedBy: userId
        },
        { transaction }
      );
    }

    if (accessibilityPayload) {
      await replaceAccessibility(transaction, event.id, userId, accessibilityPayload);
    }
  });

  const fresh = await FormEvent.findByPk(event.id, {
    include: getBaseIncludes()
  });

  return sendSuccess(res, fresh, "Form event updated successfully");
});

export const deleteFormEvent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { id: userId } = requireAuthenticatedUser(req);

  const event = await loadFormEventOrThrow(id);

  await sequelize.transaction(async (transaction) => {
    await event.update(
      {
        status: 0,
        updatedBy: userId
      },
      { transaction }
    );

    await FormEventAccessibility.update(
      { status: 0, updatedBy: userId },
      {
        where: { formEventId: event.id },
        transaction
      }
    );
  });

  return sendSuccess(res, null, "Form event deleted successfully");
});
