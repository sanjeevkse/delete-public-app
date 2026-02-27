import { Response } from "express";
import { Op } from "sequelize";
import type { Order, WhereOptions } from "sequelize";
import asyncHandler from "../utils/asyncHandler";
import { ApiError } from "../middlewares/errorHandler";
import {
  sendCreated,
  sendSuccess,
  sendValidationError,
  parseOptionalNumber,
  parseRequiredNumber,
  parseRequiredString,
  parseSortDirection,
  validateSortColumn
} from "../utils/apiResponse";
import { requireAuthenticatedUser } from "../middlewares/authMiddleware";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import ScheduleEvent from "../models/ScheduleEvent";
import ScheduleEventMedia from "../models/ScheduleEventMedia";
import { buildPublicUploadPath } from "../middlewares/uploadMiddleware";
import { MediaType } from "../types/enums";
import sequelize from "../config/database";

const excludeFields = ["createdBy", "updatedBy", "status", "createdAt", "updatedAt"];
const excludeMediaFields = ["createdBy", "updatedBy", "status", "createdAt", "updatedAt"];

const baseScheduleEventInclude = [
  {
    model: ScheduleEventMedia,
    as: "media",
    where: { status: 1 },
    required: false,
    attributes: { exclude: excludeMediaFields }
  }
];

const parseRequiredDateTime = (value: unknown, field: string): Date => {
  if (value === undefined || value === null || value === "") {
    throw new Error(`${field} is required`);
  }
  const parsed = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${field} must be a valid datetime (ISO 8601)`);
  }
  return parsed;
};

const parseOptionalDateTime = (value: unknown, field: string): Date | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const parsed = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${field} must be a valid datetime (ISO 8601)`);
  }
  return parsed;
};

const parseOptionalString = (value: unknown, field: string): string | null => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error(`${field} must be a string`);
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const parseOptionalBoolean = (value: unknown, field: string): boolean | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes"].includes(normalized)) return true;
    if (["false", "0", "no"].includes(normalized)) return false;
  }
  throw new Error(`${field} must be a boolean`);
};

const parseOptionalStatus = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if (![0, 1].includes(parsed)) {
    throw new Error("status must be 0 or 1");
  }
  return parsed;
};

export const createScheduleEvent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);

  const validationErrors: Array<{ field: string; message: string }> = [];

  let title: string | null = null;
  try {
    title = parseRequiredString(req.body?.title, "title");
  } catch (error) {
    validationErrors.push({ field: "title", message: (error as Error).message });
  }

  let start: Date | null = null;
  let end: Date | null = null;

  try {
    start = parseRequiredDateTime(req.body?.start ?? req.body?.startAt, "start");
  } catch (error) {
    validationErrors.push({ field: "start", message: (error as Error).message });
  }

  try {
    end = parseRequiredDateTime(req.body?.end ?? req.body?.endAt, "end");
  } catch (error) {
    validationErrors.push({ field: "end", message: (error as Error).message });
  }

  if (start && end && end.getTime() < start.getTime()) {
    validationErrors.push({ field: "end", message: "end must be after start" });
  }

  let latitude: number | null = null;
  let longitude: number | null = null;

  try {
    latitude = parseRequiredNumber(req.body?.latitude, "latitude");
  } catch (error) {
    validationErrors.push({ field: "latitude", message: (error as Error).message });
  }

  try {
    longitude = parseRequiredNumber(req.body?.longitude, "longitude");
  } catch (error) {
    validationErrors.push({ field: "longitude", message: (error as Error).message });
  }

  let description: string | null = null;
  let eventType: string | null = null;
  let priority: string | null = null;
  let locationText: string | null = null;
  let allDay: boolean | undefined;

  try {
    description = parseOptionalString(req.body?.description, "description");
  } catch (error) {
    validationErrors.push({ field: "description", message: (error as Error).message });
  }

  try {
    eventType = parseOptionalString(req.body?.eventType, "eventType");
  } catch (error) {
    validationErrors.push({ field: "eventType", message: (error as Error).message });
  }

  try {
    priority = parseOptionalString(req.body?.priority, "priority");
  } catch (error) {
    validationErrors.push({ field: "priority", message: (error as Error).message });
  }

  try {
    locationText = parseOptionalString(
      req.body?.locationText ?? req.body?.location ?? req.body?.venue,
      "locationText"
    );
  } catch (error) {
    validationErrors.push({ field: "locationText", message: (error as Error).message });
  }

  try {
    allDay = parseOptionalBoolean(req.body?.allDay, "allDay");
  } catch (error) {
    validationErrors.push({ field: "allDay", message: (error as Error).message });
  }

  const rawWardNumberId = req.body?.wardNumberId ?? req.body?.ward_id ?? req.body?.wardId;
  const rawBoothNumberId = req.body?.boothNumberId ?? req.body?.booth_id ?? req.body?.boothId;

  let wardNumberId: number | null = null;
  let boothNumberId: number | null = null;

  try {
    const parsedWard = parseOptionalNumber(rawWardNumberId, "wardNumberId");
    const parsedBooth = parseOptionalNumber(rawBoothNumberId, "boothNumberId");
    wardNumberId = parsedWard ?? null;
    boothNumberId = parsedBooth ?? null;
  } catch (error) {
    validationErrors.push({ field: "wardNumberId/boothNumberId", message: (error as Error).message });
  }

  if (validationErrors.length > 0) {
    return sendValidationError(res, "Validation failed", validationErrors);
  }

  const uploadedFiles = Array.isArray(req.files) ? (req.files as Express.Multer.File[]) : [];

  const created = await sequelize.transaction(async (transaction) => {
    const event = await ScheduleEvent.create(
      {
        title: title as string,
        description,
        eventType,
        priority,
        start: start as Date,
        end: end as Date,
        allDay: allDay ? 1 : 0,
        locationText,
        latitude: latitude as number,
        longitude: longitude as number,
        wardNumberId,
        boothNumberId,
        createdBy: userId,
        updatedBy: userId,
        status: 1
      },
      { transaction }
    );

    if (uploadedFiles.length > 0) {
      const mediaPayload = uploadedFiles.map((file, index) => ({
        scheduleEventId: event.id,
        mediaType: file.mimetype.startsWith("video/") ? MediaType.VIDEO : MediaType.PHOTO,
        mediaUrl: buildPublicUploadPath(file.path),
        thumbnailUrl: null,
        mimeType: file.mimetype,
        durationSecond: null,
        positionNumber: index + 1,
        caption: null,
        createdBy: userId,
        updatedBy: userId,
        status: 1
      }));
      await ScheduleEventMedia.bulkCreate(mediaPayload, { transaction });
    }

    return event;
  });

  const result = await ScheduleEvent.findByPk(created.id, {
    attributes: { exclude: excludeFields },
    include: baseScheduleEventInclude
  });

  return sendCreated(res, result, "Schedule event created successfully");
});

export const listScheduleEvents = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const validationErrors: Array<{ field: string; message: string }> = [];
  const filters: WhereOptions[] = [{ status: 1 }];

  let title: string | null = null;
  let eventType: string | null = null;
  let priority: string | null = null;
  let locationText: string | null = null;
  let searchTerm: string | null = null;
  let allDay: boolean | undefined;
  let wardNumberId: number | undefined;
  let boothNumberId: number | undefined;
  let latitude: number | undefined;
  let longitude: number | undefined;
  let startFrom: Date | undefined;
  let startTo: Date | undefined;
  let endFrom: Date | undefined;
  let endTo: Date | undefined;

  try {
    title = parseOptionalString(req.query.title, "title");
  } catch (error) {
    validationErrors.push({ field: "title", message: (error as Error).message });
  }

  try {
    eventType = parseOptionalString(req.query.eventType, "eventType");
  } catch (error) {
    validationErrors.push({ field: "eventType", message: (error as Error).message });
  }

  try {
    priority = parseOptionalString(req.query.priority, "priority");
  } catch (error) {
    validationErrors.push({ field: "priority", message: (error as Error).message });
  }

  try {
    locationText = parseOptionalString(req.query.locationText, "locationText");
  } catch (error) {
    validationErrors.push({ field: "locationText", message: (error as Error).message });
  }

  try {
    searchTerm = parseOptionalString(req.query.search, "search");
  } catch (error) {
    validationErrors.push({ field: "search", message: (error as Error).message });
  }

  try {
    allDay = parseOptionalBoolean(req.query.allDay, "allDay");
  } catch (error) {
    validationErrors.push({ field: "allDay", message: (error as Error).message });
  }

  try {
    wardNumberId = parseOptionalNumber(req.query.wardNumberId, "wardNumberId");
  } catch (error) {
    validationErrors.push({ field: "wardNumberId", message: (error as Error).message });
  }

  try {
    boothNumberId = parseOptionalNumber(req.query.boothNumberId, "boothNumberId");
  } catch (error) {
    validationErrors.push({ field: "boothNumberId", message: (error as Error).message });
  }

  try {
    latitude = parseOptionalNumber(req.query.latitude, "latitude");
  } catch (error) {
    validationErrors.push({ field: "latitude", message: (error as Error).message });
  }

  try {
    longitude = parseOptionalNumber(req.query.longitude, "longitude");
  } catch (error) {
    validationErrors.push({ field: "longitude", message: (error as Error).message });
  }

  try {
    startFrom = parseOptionalDateTime(req.query.startFrom, "startFrom");
  } catch (error) {
    validationErrors.push({ field: "startFrom", message: (error as Error).message });
  }

  try {
    startTo = parseOptionalDateTime(req.query.startTo, "startTo");
  } catch (error) {
    validationErrors.push({ field: "startTo", message: (error as Error).message });
  }

  try {
    endFrom = parseOptionalDateTime(req.query.endFrom, "endFrom");
  } catch (error) {
    validationErrors.push({ field: "endFrom", message: (error as Error).message });
  }

  try {
    endTo = parseOptionalDateTime(req.query.endTo, "endTo");
  } catch (error) {
    validationErrors.push({ field: "endTo", message: (error as Error).message });
  }

  if (validationErrors.length > 0) {
    return sendValidationError(res, "Validation failed", validationErrors);
  }

  if (title) {
    filters.push({ title: { [Op.like]: `%${title}%` } });
  }

  if (eventType) {
    filters.push({ eventType: { [Op.like]: `%${eventType}%` } });
  }

  if (priority) {
    filters.push({ priority: { [Op.like]: `%${priority}%` } });
  }

  if (locationText) {
    filters.push({ locationText: { [Op.like]: `%${locationText}%` } });
  }

  if (typeof allDay === "boolean") {
    filters.push({ allDay: allDay ? 1 : 0 });
  }

  if (wardNumberId !== undefined) {
    filters.push({ wardNumberId });
  }

  if (boothNumberId !== undefined) {
    filters.push({ boothNumberId });
  }

  if (latitude !== undefined) {
    filters.push({ latitude });
  }

  if (longitude !== undefined) {
    filters.push({ longitude });
  }

  if (startFrom || startTo) {
    filters.push({
      start: {
        ...(startFrom ? { [Op.gte]: startFrom } : {}),
        ...(startTo ? { [Op.lte]: startTo } : {})
      }
    });
  }

  if (endFrom || endTo) {
    filters.push({
      end: {
        ...(endFrom ? { [Op.gte]: endFrom } : {}),
        ...(endTo ? { [Op.lte]: endTo } : {})
      }
    });
  }

  if (searchTerm) {
    filters.push({
      [Op.or]: [
        { title: { [Op.like]: `%${searchTerm}%` } },
        { description: { [Op.like]: `%${searchTerm}%` } },
        { locationText: { [Op.like]: `%${searchTerm}%` } },
        { eventType: { [Op.like]: `%${searchTerm}%` } },
        { priority: { [Op.like]: `%${searchTerm}%` } }
      ]
    });
  }

  const sortColumn = validateSortColumn(
    req.query.sortColumn ?? req.query.sortBy,
    ["start", "end", "title", "createdAt", "updatedAt", "priority", "eventType"],
    "start"
  );
  const sortDirection = parseSortDirection(req.query.sort, "ASC");
  const order: Order = [[sortColumn, sortDirection]];
  if (sortColumn !== "start") {
    order.push(["start", "ASC"]);
  }
  if (sortColumn !== "end") {
    order.push(["end", "ASC"]);
  }

  const rows = await ScheduleEvent.findAll({
    where: { [Op.and]: filters },
    attributes: { exclude: excludeFields },
    include: baseScheduleEventInclude,
    order
  });

  const payload = rows.map((row) => ({
    id: String(row.id),
    title: row.title,
    start: row.start instanceof Date ? row.start.toISOString() : new Date(row.start).toISOString(),
    end: row.end instanceof Date ? row.end.toISOString() : new Date(row.end).toISOString()
  }));

  return sendSuccess(
    res,
    payload,
    payload.length ? "Schedule events fetched successfully" : "No events found"
  );
});

export const getScheduleEventById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const event = await ScheduleEvent.findOne({
    where: { id, status: 1 },
    attributes: { exclude: excludeFields },
    include: baseScheduleEventInclude
  });

  if (!event) {
    throw new ApiError("Event not found or inactive", 404);
  }

  return sendSuccess(res, event, "Schedule event fetched successfully");
});

export const updateScheduleEvent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);
  const { id } = req.params;

  const event = await ScheduleEvent.findOne({ where: { id, status: 1 } });
  if (!event) {
    throw new ApiError("Event not found or inactive", 404);
  }

  const validationErrors: Array<{ field: string; message: string }> = [];
  const updates: Record<string, unknown> = { updatedBy: userId };

  if (req.body?.title !== undefined) {
    try {
      updates.title = parseRequiredString(req.body.title, "title");
    } catch (error) {
      validationErrors.push({ field: "title", message: (error as Error).message });
    }
  }

  if (req.body?.description !== undefined) {
    try {
      updates.description = parseOptionalString(req.body.description, "description");
    } catch (error) {
      validationErrors.push({ field: "description", message: (error as Error).message });
    }
  }

  if (req.body?.eventType !== undefined) {
    try {
      updates.eventType = parseOptionalString(req.body.eventType, "eventType");
    } catch (error) {
      validationErrors.push({ field: "eventType", message: (error as Error).message });
    }
  }

  if (req.body?.priority !== undefined) {
    try {
      updates.priority = parseOptionalString(req.body.priority, "priority");
    } catch (error) {
      validationErrors.push({ field: "priority", message: (error as Error).message });
    }
  }

  if (req.body?.locationText !== undefined || req.body?.location !== undefined || req.body?.venue !== undefined) {
    try {
      updates.locationText = parseOptionalString(
        req.body?.locationText ?? req.body?.location ?? req.body?.venue,
        "locationText"
      );
    } catch (error) {
      validationErrors.push({ field: "locationText", message: (error as Error).message });
    }
  }

  if (req.body?.latitude !== undefined) {
    try {
      updates.latitude = parseRequiredNumber(req.body.latitude, "latitude");
    } catch (error) {
      validationErrors.push({ field: "latitude", message: (error as Error).message });
    }
  }

  if (req.body?.longitude !== undefined) {
    try {
      updates.longitude = parseRequiredNumber(req.body.longitude, "longitude");
    } catch (error) {
      validationErrors.push({ field: "longitude", message: (error as Error).message });
    }
  }

  if (req.body?.allDay !== undefined) {
    try {
      const parsed = parseOptionalBoolean(req.body.allDay, "allDay");
      if (parsed !== undefined) {
        updates.allDay = parsed ? 1 : 0;
      }
    } catch (error) {
      validationErrors.push({ field: "allDay", message: (error as Error).message });
    }
  }

  if (req.body?.wardNumberId !== undefined || req.body?.ward_id !== undefined || req.body?.wardId !== undefined) {
    try {
      const rawWardNumberId = req.body?.wardNumberId ?? req.body?.ward_id ?? req.body?.wardId;
      const parsedWard = parseOptionalNumber(rawWardNumberId, "wardNumberId");
      if (parsedWard !== undefined) {
        updates.wardNumberId = parsedWard;
      }
    } catch (error) {
      validationErrors.push({ field: "wardNumberId", message: (error as Error).message });
    }
  }

  if (req.body?.boothNumberId !== undefined || req.body?.booth_id !== undefined || req.body?.boothId !== undefined) {
    try {
      const rawBoothNumberId = req.body?.boothNumberId ?? req.body?.booth_id ?? req.body?.boothId;
      const parsedBooth = parseOptionalNumber(rawBoothNumberId, "boothNumberId");
      if (parsedBooth !== undefined) {
        updates.boothNumberId = parsedBooth;
      }
    } catch (error) {
      validationErrors.push({ field: "boothNumberId", message: (error as Error).message });
    }
  }

  let parsedStart: Date | undefined;
  let parsedEnd: Date | undefined;

  if (req.body?.start !== undefined || req.body?.startAt !== undefined) {
    try {
      parsedStart = parseOptionalDateTime(req.body?.start ?? req.body?.startAt, "start");
      if (parsedStart) {
        updates.start = parsedStart;
      }
    } catch (error) {
      validationErrors.push({ field: "start", message: (error as Error).message });
    }
  }

  if (req.body?.end !== undefined || req.body?.endAt !== undefined) {
    try {
      parsedEnd = parseOptionalDateTime(req.body?.end ?? req.body?.endAt, "end");
      if (parsedEnd) {
        updates.end = parsedEnd;
      }
    } catch (error) {
      validationErrors.push({ field: "end", message: (error as Error).message });
    }
  }

  if (req.body?.status !== undefined) {
    try {
      const parsedStatus = parseOptionalStatus(req.body.status);
      if (parsedStatus !== undefined) {
        updates.status = parsedStatus;
      }
    } catch (error) {
      validationErrors.push({ field: "status", message: (error as Error).message });
    }
  }

  const nextStart = (updates.start as Date | undefined) ?? event.start;
  const nextEnd = (updates.end as Date | undefined) ?? event.end;

  if (nextEnd.getTime() < nextStart.getTime()) {
    validationErrors.push({ field: "end", message: "end must be after start" });
  }

  if (validationErrors.length > 0) {
    return sendValidationError(res, "Validation failed", validationErrors);
  }

  const uploadedFiles = Array.isArray(req.files) ? (req.files as Express.Multer.File[]) : [];

  await sequelize.transaction(async (transaction) => {
    await event.update(updates, { transaction });

    if (uploadedFiles.length > 0) {
      await ScheduleEventMedia.update(
        { status: 0, updatedBy: userId },
        { where: { scheduleEventId: event.id, status: 1 }, transaction }
      );

      const mediaPayload = uploadedFiles.map((file, index) => ({
        scheduleEventId: event.id,
        mediaType: file.mimetype.startsWith("video/") ? MediaType.VIDEO : MediaType.PHOTO,
        mediaUrl: buildPublicUploadPath(file.path),
        thumbnailUrl: null,
        mimeType: file.mimetype,
        durationSecond: null,
        positionNumber: index + 1,
        caption: null,
        createdBy: userId,
        updatedBy: userId,
        status: 1
      }));
      await ScheduleEventMedia.bulkCreate(mediaPayload, { transaction });
    }
  });

  const updated = await ScheduleEvent.findByPk(event.id, {
    attributes: { exclude: excludeFields },
    include: baseScheduleEventInclude
  });

  return sendSuccess(res, updated, "Schedule event updated successfully");
});

export const deleteScheduleEvent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);
  const { id } = req.params;

  const event = await ScheduleEvent.findOne({ where: { id, status: 1 } });
  if (!event) {
    throw new ApiError("Event not found or already deleted", 404);
  }

  await event.update({ status: 0, updatedBy: userId });

  return sendSuccess(res, null, "Schedule event deleted successfully");
});
