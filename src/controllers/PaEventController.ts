import { Request, Response } from "express";
import { Op, Transaction, WhereOptions } from "sequelize";

import asyncHandler from "../utils/asyncHandler";
import { ApiError } from "../middlewares/errorHandler";
import {
  sendCreated,
  sendSuccess,
  calculatePagination,
  sendSuccessWithPagination,
  sendValidationError
} from "../utils/apiResponse";
import { requireAuthenticatedUser } from "../middlewares/authMiddleware";
import PaEvent from "../models/PaEvent";
import PaEventLog from "../models/PaEventLog";
import sequelize from "../config/database";

const PAGE_DEFAULT = 1;
const LIMIT_DEFAULT = 10;
const LIMIT_MAX = 100;

type ValidationErrorDetail = { field: string; message: string };

type PaEventWritableAttributes = {
  bossId: number;
  title: string;
  description: string | null;
  startDate: string;
  startTime: string;
  endDate: string | null;
  endTime: string | null;
  locationLink: string | null;
  remarks: string | null;
};

type PaEventPayload = Partial<PaEventWritableAttributes>;

const eventResponseAttributes = [
  "id",
  "bossId",
  "title",
  "description",
  "startDate",
  "startTime",
  "endDate",
  "endTime",
  "locationLink",
  "remarks",
  "createdBy",
  "updatedBy",
  "createdAt",
  "updatedAt",
  "status"
] as const;

const eventLogAttributes = [
  ...eventResponseAttributes,
  "createdBy",
  "updatedBy",
  "createdAt",
  "updatedAt"
] as const;

type ParseOptions = {
  requireBaseFields?: boolean;
  currentEvent?: PaEvent;
};

type SymbolicWhereOptions = WhereOptions & { [key: symbol]: unknown };

const parseSortDirection = (
  value: unknown,
  defaultDirection: "ASC" | "DESC" = "ASC"
): "ASC" | "DESC" => {
  if (typeof value !== "string") {
    return defaultDirection;
  }
  const normalized = value.trim().toUpperCase();
  return normalized === "ASC" || normalized === "DESC" ? normalized : defaultDirection;
};

const parsePagination = (req: Request) => {
  const page = Number.parseInt((req.query.page as string) ?? `${PAGE_DEFAULT}`, 10);
  const limit = Number.parseInt((req.query.limit as string) ?? `${LIMIT_DEFAULT}`, 10);
  const safePage = Number.isNaN(page) || page <= 0 ? PAGE_DEFAULT : page;
  const safeLimit = Number.isNaN(limit) || limit <= 0 ? LIMIT_DEFAULT : Math.min(limit, LIMIT_MAX);
  return { page: safePage, limit: safeLimit, offset: (safePage - 1) * safeLimit };
};

const normalizeNullableString = (value: unknown): string | null | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized.length === 0 ? null : normalized;
};

const isValidDateOnly = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

const isValidTime = (value: string): boolean =>
  /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/.test(value);

const toDateOnlyValue = (value: Date | string | null | undefined): string | null => {
  if (!value) {
    return null;
  }
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
};

const compareTimes = (a: string, b: string): number => {
  const [aHour, aMinute, aSecond = "0"] = a.split(":");
  const [bHour, bMinute, bSecond = "0"] = b.split(":");
  const toSeconds = (hour: string, minute: string, second: string) =>
    Number.parseInt(hour ?? "0", 10) * 3600 +
    Number.parseInt(minute ?? "0", 10) * 60 +
    Number.parseInt(second ?? "0", 10);
  return toSeconds(aHour, aMinute, aSecond) - toSeconds(bHour, bMinute, bSecond);
};

const parsePaEventPayload = (
  body: Record<string, unknown>,
  options: ParseOptions = {}
): { payload: PaEventPayload; errors: ValidationErrorDetail[] } => {
  const errors: ValidationErrorDetail[] = [];
  const payload: PaEventPayload = {};

  const bossIdValue = body.bossId;
  if (bossIdValue !== undefined) {
    const parsedBossId = Number(bossIdValue);
    if (Number.isNaN(parsedBossId) || parsedBossId <= 0) {
      errors.push({ field: "bossId", message: "bossId must be a positive number" });
    } else {
      payload.bossId = parsedBossId;
    }
  } else if (options.requireBaseFields) {
    errors.push({ field: "bossId", message: "bossId is required" });
  }

  const titleValue = body.title;
  if (titleValue !== undefined) {
    const normalized = normalizeNullableString(titleValue);
    if (!normalized) {
      errors.push({ field: "title", message: "Title is required" });
    } else {
      payload.title = normalized;
    }
  } else if (options.requireBaseFields) {
    errors.push({ field: "title", message: "Title is required" });
  }

  const descriptionValue = normalizeNullableString(body.description);
  if (descriptionValue !== undefined) {
    payload.description = descriptionValue;
  }

  const startDateValue = body.startDate;
  if (startDateValue !== undefined) {
    const normalized = normalizeNullableString(startDateValue);
    if (!normalized) {
      errors.push({ field: "startDate", message: "Start date is required" });
    } else if (!isValidDateOnly(normalized)) {
      errors.push({ field: "startDate", message: "Start date must be in YYYY-MM-DD format" });
    } else {
      payload.startDate = normalized;
    }
  } else if (options.requireBaseFields) {
    errors.push({ field: "startDate", message: "Start date is required" });
  }

  const startTimeValue = body.startTime;
  if (startTimeValue !== undefined) {
    const normalized = normalizeNullableString(startTimeValue);
    if (!normalized) {
      errors.push({ field: "startTime", message: "Start time is required" });
    } else if (!isValidTime(normalized)) {
      errors.push({
        field: "startTime",
        message: "Start time must be in HH:mm or HH:mm:ss format"
      });
    } else {
      payload.startTime = normalized;
    }
  } else if (options.requireBaseFields) {
    errors.push({ field: "startTime", message: "Start time is required" });
  }

  const endDateValue = normalizeNullableString(body.endDate);
  if (endDateValue !== undefined) {
    if (endDateValue && !isValidDateOnly(endDateValue)) {
      errors.push({ field: "endDate", message: "End date must be in YYYY-MM-DD format" });
    } else {
      payload.endDate = endDateValue ?? null;
    }
  }

  const endTimeValue = normalizeNullableString(body.endTime);
  if (endTimeValue !== undefined) {
    if (endTimeValue && !isValidTime(endTimeValue)) {
      errors.push({ field: "endTime", message: "End time must be in HH:mm or HH:mm:ss format" });
    } else {
      payload.endTime = endTimeValue ?? null;
    }
  }

  const locationLinkValue = normalizeNullableString(body.locationLink);
  if (locationLinkValue !== undefined) {
    if (locationLinkValue && locationLinkValue.length > 512) {
      errors.push({ field: "locationLink", message: "locationLink cannot exceed 512 characters" });
    } else {
      payload.locationLink = locationLinkValue ?? null;
    }
  }

  const remarksValue = normalizeNullableString(body.remarks);
  if (remarksValue !== undefined) {
    payload.remarks = remarksValue ?? null;
  }

  const effectiveStartDate: string | null =
    payload.startDate ?? toDateOnlyValue(options.currentEvent?.startDate) ?? null;
  const effectiveEndDate: string | null =
    payload.endDate ?? toDateOnlyValue(options.currentEvent?.endDate) ?? null;

  if (effectiveStartDate && effectiveEndDate) {
    const startDate = new Date(effectiveStartDate);
    const endDate = new Date(effectiveEndDate);
    if (endDate.getTime() < startDate.getTime()) {
      errors.push({ field: "endDate", message: "End date cannot be before start date" });
    } else if (endDate.getTime() === startDate.getTime()) {
      const effectiveStartTime = payload.startTime ?? options.currentEvent?.startTime ?? null;
      const effectiveEndTime = payload.endTime ?? options.currentEvent?.endTime ?? null;
      if (
        effectiveStartTime &&
        effectiveEndTime &&
        compareTimes(effectiveEndTime, effectiveStartTime) < 0
      ) {
        errors.push({ field: "endTime", message: "End time cannot be before start time" });
      }
    }
  }

  return { payload, errors };
};

const sanitizeEventResponse = (event: PaEvent): Record<string, unknown> => {
  const plain = event.get({ plain: true }) as Record<string, unknown>;
  return eventResponseAttributes.reduce<Record<string, unknown>>((acc, key) => {
    acc[key] = plain[key] ?? null;
    return acc;
  }, {});
};

const buildEventLogData = (event: PaEvent | Record<string, unknown>): Record<string, unknown> => {
  const plain =
    typeof (event as PaEvent).get === "function"
      ? ((event as PaEvent).get({ plain: true }) as Record<string, unknown>)
      : (event as Record<string, unknown>);

  return eventLogAttributes.reduce<Record<string, unknown>>((acc, key) => {
    acc[key] = plain[key] ?? null;
    return acc;
  }, {});
};

const recordPaEventLog = async (
  params: {
    eventId: number;
    oldData: Record<string, unknown> | null;
    newData: Record<string, unknown> | null;
    userId: number;
  },
  transaction?: Transaction
): Promise<void> => {
  const { eventId, oldData, newData, userId } = params;
  await PaEventLog.create(
    {
      eventId,
      oldJson: oldData,
      newJson: newData,
      createdBy: userId,
      updatedBy: userId,
      status: 1
    },
    { transaction }
  );
};

export const createPaEvent = asyncHandler(async (req: Request, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);
  const { payload, errors } = parsePaEventPayload(req.body ?? {}, { requireBaseFields: true });

  if (errors.length > 0) {
    return sendValidationError(res, "Validation failed", errors);
  }

  const event = await sequelize.transaction(async (transaction) => {
    const created = await PaEvent.create(
      {
        bossId: payload.bossId as number,
        title: payload.title as string,
        description: payload.description ?? null,
        startDate: new Date(payload.startDate as string),
        startTime: payload.startTime as string,
        endDate: payload.endDate ? new Date(payload.endDate) : null,
        endTime: payload.endTime ?? null,
        locationLink: payload.locationLink ?? null,
        remarks: payload.remarks ?? null,
        status: 1,
        createdBy: userId,
        updatedBy: userId
      },
      { transaction }
    );

    await recordPaEventLog(
      {
        eventId: created.id,
        oldData: null,
        newData: buildEventLogData(created),
        userId
      },
      transaction
    );

    return created;
  });

  return sendCreated(res, sanitizeEventResponse(event), "Event created successfully");
});

export const listPaEvents = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = parsePagination(req);
  const sortDirection = parseSortDirection(req.query.sort, "ASC");

  const where: SymbolicWhereOptions = {};

  const search = (req.query.search as string | undefined)?.trim();
  const statusParam = req.query.status as string | undefined;
  const bossIdParam = req.query.bossId as string | undefined;
  const startDateFilter = (req.query.startDate as string | undefined)?.trim();
  const endDateFilter = (req.query.endDate as string | undefined)?.trim();

  if (statusParam !== undefined) {
    const parsedStatus = Number(statusParam);
    if (!Number.isNaN(parsedStatus)) {
      where.status = parsedStatus;
    }
  }

  if (bossIdParam !== undefined) {
    const parsedBossId = Number(bossIdParam);
    if (!Number.isNaN(parsedBossId)) {
      where.bossId = parsedBossId;
    }
  }

  if (search) {
    where[Op.or] = [
      { title: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } }
    ];
  }

  if (startDateFilter && endDateFilter) {
    where.startDate = { [Op.between]: [startDateFilter, endDateFilter] };
  } else if (startDateFilter) {
    where.startDate = startDateFilter;
  }

  const { rows, count } = await PaEvent.findAndCountAll({
    where,
    attributes: [...eventResponseAttributes],
    order: [
      ["startDate", sortDirection],
      ["startTime", sortDirection]
    ],
    limit,
    offset,
    distinct: true
  });

  const pagination = calculatePagination(count, page, limit);
  const data = rows.map((event) => sanitizeEventResponse(event));

  return sendSuccessWithPagination(
    res,
    data,
    pagination,
    data.length ? "Events fetched successfully" : "No events found"
  );
});

export const getPaEventById = asyncHandler(async (req: Request, res: Response) => {
  const eventId = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(eventId)) {
    throw new ApiError("Invalid event id", 400);
  }

  const event = await PaEvent.findOne({
    where: { id: eventId, status: 1 },
    attributes: [...eventResponseAttributes]
  });

  if (!event) {
    throw new ApiError("Event not found or inactive", 404);
  }

  return sendSuccess(res, sanitizeEventResponse(event), "Event fetched successfully");
});

export const updatePaEvent = asyncHandler(async (req: Request, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);
  const eventId = Number.parseInt(req.params.id, 10);

  if (Number.isNaN(eventId)) {
    throw new ApiError("Invalid event id", 400);
  }

  const event = await PaEvent.findOne({ where: { id: eventId, status: 1 } });
  if (!event) {
    throw new ApiError("Event not found or inactive", 404);
  }

  const { payload, errors } = parsePaEventPayload(req.body ?? {}, { currentEvent: event });

  if (errors.length > 0) {
    return sendValidationError(res, "Validation failed", errors);
  }

  if (Object.keys(payload).length === 0) {
    return sendValidationError(res, "Validation failed", [
      {
        field: "payload",
        message: "Provide at least one field to update"
      }
    ]);
  }

  const updatedEvent = await sequelize.transaction(async (transaction) => {
    const previousState = buildEventLogData(event);
    const updatePayload: Record<string, unknown> = { updatedBy: userId };
    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined) {
        return;
      }
      if (key === "startDate") {
        updatePayload.startDate = new Date(value as string);
        return;
      }
      if (key === "endDate") {
        updatePayload.endDate = value ? new Date(value as string) : null;
        return;
      }
      updatePayload[key] = value;
    });

    await event.update(updatePayload, { transaction });
    await event.reload({ transaction });

    await recordPaEventLog(
      {
        eventId: event.id,
        oldData: previousState,
        newData: buildEventLogData(event),
        userId
      },
      transaction
    );

    return event;
  });

  return sendSuccess(res, sanitizeEventResponse(updatedEvent), "Event updated successfully");
});

export const deletePaEvent = asyncHandler(async (req: Request, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);
  const eventId = Number.parseInt(req.params.id, 10);

  if (Number.isNaN(eventId)) {
    throw new ApiError("Invalid event id", 400);
  }

  const event = await PaEvent.findOne({ where: { id: eventId, status: 1 } });
  if (!event) {
    throw new ApiError("Event not found or already deleted", 404);
  }

  await sequelize.transaction(async (transaction) => {
    const previousState = buildEventLogData(event);
    await event.update({ status: 0, updatedBy: userId }, { transaction });
    await event.reload({ transaction });

    await recordPaEventLog(
      {
        eventId: event.id,
        oldData: previousState,
        newData: buildEventLogData(event),
        userId
      },
      transaction
    );
  });

  return sendSuccess(res, null, "Event deleted successfully");
});
