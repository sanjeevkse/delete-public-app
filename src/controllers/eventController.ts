import type { Request, Response } from "express";
import type { FindAttributeOptions, WhereOptions } from "sequelize";
import { Op } from "sequelize";

import { ADMIN_ROLE_NAME } from "../config/rbac";
import sequelize from "../config/database";
import { ApiError } from "../middlewares/errorHandler";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { requireAuthenticatedUser } from "../middlewares/authMiddleware";
import Event from "../models/Event";
import EventMedia from "../models/EventMedia";
import EventRegistration from "../models/EventRegistration";
import { EventMediaType } from "../types/enums";
import asyncHandler from "../utils/asyncHandler";

type NormalizedMediaInput = {
  mediaType: EventMediaType;
  mediaUrl: string;
  thumbnailUrl: string | null;
  mimeType: string | null;
  durationSecond: number | null;
  positionNumber: number;
  caption: string | null;
};

const resolveTableName = (
  model: typeof Event | typeof EventMedia | typeof EventRegistration
): string => {
  const raw = model.getTableName();
  return typeof raw === "string" ? raw : raw.tableName;
};

const EVENT_REGISTRATION_TABLE = resolveTableName(EventRegistration);

const registrationsCountAttribute = [
  sequelize.literal(`(
    SELECT COUNT(*)
    FROM ${EVENT_REGISTRATION_TABLE} AS er
    WHERE er.event_id = Event.id
      AND er.status = 1
  )`),
  "registrationsCount"
] as const;

const attributesWithCounts: FindAttributeOptions = {
  include: [registrationsCountAttribute]
};

const baseEventInclude = [
  {
    association: "media",
    attributes: [
      "id",
      "mediaType",
      "mediaUrl",
      "thumbnailUrl",
      "mimeType",
      "durationSecond",
      "positionNumber",
      "caption",
      "createdAt"
    ],
    where: { status: 1 },
    required: false
  }
];

const isAdmin = (roles: string[]): boolean => {
  const normalizedRoles = roles.map((role) => role.toLowerCase());
  return normalizedRoles.includes(ADMIN_ROLE_NAME.toLowerCase());
};

const parsePagination = (req: Request) => {
  const page = Number.parseInt((req.query.page as string) ?? "1", 10);
  const limit = Number.parseInt((req.query.limit as string) ?? "20", 10);

  const safePage = Number.isNaN(page) || page <= 0 ? 1 : page;
  const safeLimit = Number.isNaN(limit) || limit <= 0 ? 20 : Math.min(limit, 100);

  return {
    page: safePage,
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit
  };
};

const parseRequiredString = (value: unknown, field: string): string => {
  if (typeof value !== "string") {
    throw new ApiError(`${field} is required`, 400);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new ApiError(`${field} cannot be empty`, 400);
  }
  return trimmed;
};

const isValidDateOnly = (value: string): boolean => {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
};

const parseRequiredDateOnly = (value: unknown, field: string): string => {
  if (typeof value !== "string" || !isValidDateOnly(value)) {
    throw new ApiError(`${field} must be a valid date (YYYY-MM-DD)`, 400);
  }
  return value;
};

const isValidTime = (value: string): boolean => {
  return /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/.test(value);
};

const parseRequiredTime = (value: unknown, field: string): string => {
  if (typeof value !== "string" || !isValidTime(value)) {
    throw new ApiError(`${field} must be a valid time (HH:mm or HH:mm:ss)`, 400);
  }
  return value;
};

const parseOptionalDateOnly = (value: unknown, field: string): string | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value !== "string" || !isValidDateOnly(value)) {
    throw new ApiError(`${field} must be a valid date (YYYY-MM-DD)`, 400);
  }
  return value;
};

const parseOptionalTime = (value: unknown, field: string): string | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value !== "string" || !isValidTime(value)) {
    throw new ApiError(`${field} must be a valid time (HH:mm or HH:mm:ss)`, 400);
  }
  return value;
};

const parseOptionalNumber = (value: unknown, field: string): number | null => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const numberValue = typeof value === "number" ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(numberValue)) {
    throw new ApiError(`${field} must be a valid number`, 400);
  }
  return numberValue;
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

const normalizeMediaInput = (mediaInput: unknown): NormalizedMediaInput[] | null => {
  if (mediaInput === undefined) {
    return null;
  }

  if (!Array.isArray(mediaInput)) {
    throw new ApiError("media must be an array", 400);
  }

  const normalized = mediaInput
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const {
        mediaType,
        mediaUrl,
        thumbnailUrl,
        mimeType,
        durationSecond,
        positionNumber,
        caption
      } = item as Record<string, unknown>;

      if (typeof mediaType !== "string") {
        return null;
      }

      const upperType = mediaType.toUpperCase() as EventMediaType;
      if (upperType !== EventMediaType.PHOTO && upperType !== EventMediaType.VIDEO) {
        return null;
      }

      if (typeof mediaUrl !== "string" || mediaUrl.trim().length === 0) {
        return null;
      }

      const normalizedThumbnail =
        typeof thumbnailUrl === "string" && thumbnailUrl.trim().length > 0
          ? thumbnailUrl.trim()
          : null;

      const normalizedMime =
        typeof mimeType === "string" && mimeType.trim().length > 0 ? mimeType.trim() : null;

      const normalizedDuration = parseOptionalNumber(durationSecond, "durationSecond");

      const normalizedPosition =
        parseOptionalNumber(positionNumber, "positionNumber") ?? index + 1;

      const normalizedCaption =
        typeof caption === "string" && caption.trim().length > 0 ? caption.trim() : null;

      return {
        mediaType: upperType,
        mediaUrl: mediaUrl.trim(),
        thumbnailUrl: normalizedThumbnail,
        mimeType: normalizedMime,
        durationSecond: normalizedDuration,
        positionNumber: normalizedPosition,
        caption: normalizedCaption
      };
    })
    .filter((value): value is NormalizedMediaInput => value !== null);

  return normalized;
};

const computePaginationMeta = (total: number, page: number, limit: number) => ({
  total,
  page,
  pages: Math.ceil(total / limit)
});

const fetchEventById = async (id: number) => {
  return Event.findOne({
    where: { id, status: 1 },
    attributes: attributesWithCounts,
    include: baseEventInclude
  });
};

export const createEvent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);

  const title = parseRequiredString(req.body?.title, "title");
  const description = parseRequiredString(req.body?.description, "description");
  const place = parseRequiredString(req.body?.place, "place");
  const googleMapLink = parseRequiredString(req.body?.googleMapLink, "googleMapLink");
  const startDate = parseRequiredDateOnly(req.body?.startDate, "startDate");
  const startTime = parseRequiredTime(req.body?.startTime, "startTime");
  const endDate = parseRequiredDateOnly(req.body?.endDate, "endDate");
  const endTime = parseRequiredTime(req.body?.endTime, "endTime");

  const media = normalizeMediaInput(req.body?.media);

  const createdEventId = await sequelize.transaction(async (transaction) => {
    const event = await Event.create(
      {
        title,
        description,
        place,
        googleMapLink,
        startDate: new Date(startDate),
        startTime,
        endDate: new Date(endDate),
        endTime,
        status: 1,
        createdBy: userId,
        updatedBy: userId
      },
      { transaction }
    );

    if (media && media.length > 0) {
      await EventMedia.bulkCreate(
        media.map((item) => ({
          eventId: event.id,
          mediaType: item.mediaType,
          mediaUrl: item.mediaUrl,
          thumbnailUrl: item.thumbnailUrl,
          mimeType: item.mimeType,
          durationSecond: item.durationSecond,
          positionNumber: item.positionNumber,
          caption: item.caption,
          status: 1,
          createdBy: userId,
          updatedBy: userId
        })),
        { transaction }
      );
    }

    return event.id;
  });

  const created = await fetchEventById(createdEventId);
  res.status(201).json(created);
});

export const getEvent = asyncHandler(async (req: Request, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw new ApiError("Invalid event id", 400);
  }

  const event = await fetchEventById(id);
  if (!event) {
    throw new ApiError("Event not found", 404);
  }

  res.json(event);
});

export const listEvents = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = parsePagination(req);

  const where: WhereOptions = {
    status: 1
  };

  const titleFilter = (req.query.title as string | undefined)?.trim();
  if (titleFilter) {
    where.title = { [Op.like]: `%${titleFilter}%` };
  }

  const placeFilter = (req.query.place as string | undefined)?.trim();
  if (placeFilter) {
    where.place = { [Op.like]: `%${placeFilter}%` };
  }

  const startDateFrom = parseOptionalDateOnly(req.query.startDateFrom, "startDateFrom");
  const startDateTo = parseOptionalDateOnly(req.query.startDateTo, "startDateTo");

  const searchTerm = (req.query.search as string | undefined)?.trim();
  if (searchTerm) {
    Object.assign(
      where,
      {
        [Op.or]: [
          { title: { [Op.like]: `%${searchTerm}%` } },
          { description: { [Op.like]: `%${searchTerm}%` } }
        ]
      } as WhereOptions
    );
  }

  if (startDateFrom || startDateTo) {
    where.startDate = {
      ...(startDateFrom ? { [Op.gte]: startDateFrom } : {}),
      ...(startDateTo ? { [Op.lte]: startDateTo } : {})
    };
  }

  const { rows, count } = await Event.findAndCountAll({
    where,
    limit,
    offset,
    attributes: attributesWithCounts,
    include: baseEventInclude,
    order: [
      ["startDate", "ASC"],
      ["startTime", "ASC"]
    ],
    distinct: true
  });

  res.json({
    data: rows,
    meta: computePaginationMeta(count, page, limit)
  });
});

export const listEventRegistrations = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const eventId = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(eventId)) {
      throw new ApiError("Invalid event id", 400);
    }

    const includeUnregistered = parseBooleanQuery(req.query.includeUnregistered);

    const event = await Event.findOne({ where: { id: eventId, status: 1 } });
    if (!event) {
      throw new ApiError("Event not found", 404);
    }

    const { page, limit, offset } = parsePagination(req);

    const where: WhereOptions = {
      eventId
    };

    if (!includeUnregistered) {
      where.status = 1;
    }

    const { rows, count } = await EventRegistration.findAndCountAll({
      where,
      include: [
        {
          association: "user",
          attributes: ["id", "fullName", "email", "contactNumber"],
          required: true
        }
      ],
      limit,
      offset,
      order: [["createdAt", "DESC"]],
      distinct: true
    });

    const data = rows.map((registration) => ({
      id: registration.id,
      status: registration.status,
      deregisterReason: registration.deregisterReason,
      deregisteredAt: registration.deregisteredAt,
      createdAt: registration.createdAt,
      updatedAt: registration.updatedAt,
      user: registration.user
        ? {
            id: registration.user.id,
            fullName: registration.user.fullName,
            email: registration.user.email,
            contactNumber: registration.user.contactNumber
          }
        : null
    }));

    res.json({
      data,
      meta: computePaginationMeta(count, page, limit),
      includeUnregistered
    });
  }
);

export const updateEvent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId, roles = [] } = requireAuthenticatedUser(req);

  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw new ApiError("Invalid event id", 400);
  }

  const event = await Event.findOne({ where: { id, status: 1 } });
  if (!event) {
    throw new ApiError("Event not found", 404);
  }

  if (event.createdBy !== null && event.createdBy !== userId && !isAdmin(roles)) {
    throw new ApiError("Forbidden", 403);
  }

  const updates: Record<string, unknown> = {};

  if (Object.prototype.hasOwnProperty.call(req.body, "title")) {
    updates.title = parseRequiredString(req.body.title, "title");
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "description")) {
    updates.description = parseRequiredString(req.body.description, "description");
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "place")) {
    updates.place = parseRequiredString(req.body.place, "place");
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "googleMapLink")) {
    updates.googleMapLink = parseRequiredString(req.body.googleMapLink, "googleMapLink");
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "startDate")) {
    const parsedStartDate = parseRequiredDateOnly(req.body.startDate, "startDate");
    updates.startDate = new Date(parsedStartDate);
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "startTime")) {
    updates.startTime = parseRequiredTime(req.body.startTime, "startTime");
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "endDate")) {
    const parsedEndDate = parseRequiredDateOnly(req.body.endDate, "endDate");
    updates.endDate = new Date(parsedEndDate);
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "endTime")) {
    updates.endTime = parseRequiredTime(req.body.endTime, "endTime");
  }

  updates.updatedBy = userId;

  const media = normalizeMediaInput(req.body?.media);

  await sequelize.transaction(async (transaction) => {
    if (Object.keys(updates).length > 0) {
      await event.update(updates, { transaction });
    }

    if (media !== null) {
      await EventMedia.update(
        { status: 0, updatedBy: userId },
        { where: { eventId: event.id }, transaction }
      );

      if (media.length > 0) {
        await EventMedia.bulkCreate(
          media.map((item) => ({
            eventId: event.id,
            mediaType: item.mediaType,
            mediaUrl: item.mediaUrl,
            thumbnailUrl: item.thumbnailUrl,
            mimeType: item.mimeType,
            durationSecond: item.durationSecond,
            positionNumber: item.positionNumber,
            caption: item.caption,
            status: 1,
            createdBy: event.createdBy ?? userId,
            updatedBy: userId
          })),
          { transaction }
        );
      }
    }
  });

  const updated = await fetchEventById(event.id);
  res.json(updated);
});

export const deleteEvent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId, roles = [] } = requireAuthenticatedUser(req);

  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw new ApiError("Invalid event id", 400);
  }

  const event = await Event.findOne({ where: { id, status: 1 } });
  if (!event) {
    throw new ApiError("Event not found", 404);
  }

  if (event.createdBy !== null && event.createdBy !== userId && !isAdmin(roles)) {
    throw new ApiError("Forbidden", 403);
  }

  await sequelize.transaction(async (transaction) => {
    await event.update({ status: 0, updatedBy: userId }, { transaction });
    await EventMedia.update(
      { status: 0, updatedBy: userId },
      { where: { eventId: event.id }, transaction }
    );
    await EventRegistration.update(
      { status: 0, updatedBy: userId },
      { where: { eventId: event.id }, transaction }
    );
  });

  res.status(204).send();
});

export const registerForEvent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);

  const eventId = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(eventId)) {
    throw new ApiError("Invalid event id", 400);
  }

  const event = await Event.findOne({ where: { id: eventId, status: 1 } });
  if (!event) {
    throw new ApiError("Event not found", 404);
  }

  const existingRegistration = await EventRegistration.findOne({
    where: { eventId, userId }
  });

  if (existingRegistration) {
    if (existingRegistration.status === 1) {
      return res.json({
        message: "Already registered",
        registration: existingRegistration
      });
    }

    await existingRegistration.update({
      status: 1,
      deregisterReason: null,
      deregisteredAt: null,
      updatedBy: userId
    });

    return res.json({
      message: "Registration reactivated",
      registration: existingRegistration
    });
  }

  const registration = await EventRegistration.create({
    eventId,
    userId,
    status: 1,
    createdBy: userId,
    updatedBy: userId
  });

  res.status(201).json({
    message: "Registered successfully",
    registration
  });
});

export const unregisterFromEvent = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id: userId } = requireAuthenticatedUser(req);

    const eventId = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(eventId)) {
      throw new ApiError("Invalid event id", 400);
    }

    const event = await Event.findOne({ where: { id: eventId, status: 1 } });
    if (!event) {
      throw new ApiError("Event not found", 404);
    }

    const registration = await EventRegistration.findOne({
      where: {
        eventId,
        userId,
        status: 1
      }
    });

    if (!registration) {
      throw new ApiError("Active registration not found", 404);
    }

    const { reason } = req.body as { reason?: string };
    const normalizedReason = typeof reason === "string" && reason.trim().length > 0 ? reason : null;

    await registration.update({
      status: 0,
      deregisterReason: normalizedReason,
      deregisteredAt: new Date(),
      updatedBy: userId
    });

    res.json({
      message: "Unregistered successfully"
    });
  }
);
