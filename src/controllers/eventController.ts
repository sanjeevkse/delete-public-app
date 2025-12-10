import type { Request, Response, Express } from "express";
import type { FindAttributeOptions, WhereOptions } from "sequelize";
import { Op } from "sequelize";

import { ADMIN_ROLE_NAME } from "../config/rbac";
import sequelize from "../config/database";
import { ApiError } from "../middlewares/errorHandler";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { requireAuthenticatedUser } from "../middlewares/authMiddleware";
import { buildPublicUploadPath } from "../middlewares/uploadMiddleware";
import { MAX_EVENT_IMAGE_COUNT, MAX_EVENT_VIDEO_COUNT } from "../middlewares/eventUploadMiddleware";
import Event from "../models/Event";
import EventMedia from "../models/EventMedia";
import EventRegistration from "../models/EventRegistration";
import { MediaType } from "../types/enums";
import asyncHandler from "../utils/asyncHandler";
import {
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendNotFound,
  sendBadRequest,
  sendForbidden,
  sendConflict,
  sendSuccessWithPagination,
  parsePaginationParams,
  calculatePagination,
  parseSortDirection,
  parseRequiredNumber,
  parseOptionalNumber,
  parseBooleanQuery
} from "../utils/apiResponse";
import { buildQueryAttributes, shouldIncludeAuditFields } from "../utils/queryAttributes";
import { assertNoRestrictedFields } from "../utils/payloadValidation";
import { emitEvent, AppEvent } from "../events/eventBus";

type NormalizedMediaInput = {
  mediaType: MediaType;
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

const buildEventAttributes = (
  includeAuditFields?: boolean,
  keepFields?: string[]
): FindAttributeOptions => {
  const baseAttrs = buildQueryAttributes({ includeAuditFields, keepFields });
  const baseInclude = Array.isArray(baseAttrs) ? baseAttrs : (baseAttrs as any)?.include || [];

  if (!baseAttrs) {
    return { include: [registrationsCountAttribute] };
  }

  return {
    ...(typeof baseAttrs === "object" && !Array.isArray(baseAttrs) ? baseAttrs : {}),
    include: [...baseInclude, registrationsCountAttribute]
  };
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

const REFERRED_BY_MAX_LENGTH = 45;

type PlainEventRegistration = {
  eventId: number;
  userId: number | null;
  fullName: string | null;
  contactNumber: string | null;
  email: string | null;
  user?: {
    id: number;
    fullName: string | null;
    email: string | null;
    contactNumber: string | null;
    profile?: {
      profileImageUrl?: string | null;
    } | null;
  } | null;
};

type RegisteredAttendee = {
  id: number | null;
  fullName: string | null;
  email: string | null;
  contactNumber: string | null;
  profileImageUrl: string | null;
  isGuest: boolean;
};

const toRegisteredAttendee = (registration: PlainEventRegistration): RegisteredAttendee | null => {
  // Check if it's a guest registration (no userId)
  if (!registration.userId && registration.fullName) {
    return {
      id: null,
      fullName: registration.fullName,
      email: registration.email,
      contactNumber: registration.contactNumber,
      profileImageUrl: null,
      isGuest: true
    };
  }

  // Regular user registration
  const user = registration.user;
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    fullName: user.fullName ?? null,
    email: user.email ?? null,
    contactNumber: user.contactNumber ?? null,
    profileImageUrl: user.profile?.profileImageUrl ?? null,
    isGuest: false
  };
};

const loadRegisteredUsersForEventIds = async (
  eventIds: number[]
): Promise<Map<number, RegisteredAttendee[]>> => {
  if (eventIds.length === 0) {
    return new Map();
  }

  const registrations = await EventRegistration.findAll({
    attributes: ["eventId", "userId", "fullName", "contactNumber", "email"],
    where: {
      eventId: { [Op.in]: eventIds },
      status: 1
    },
    include: [
      {
        association: "user",
        attributes: ["id", "fullName", "email", "contactNumber"],
        required: false,
        include: [
          {
            association: "profile",
            attributes: ["profileImageUrl"],
            required: false,
            include: [
              { association: "gender", attributes: ["id", "dispName"], required: false },
              { association: "maritalStatus", attributes: ["id", "dispName"], required: false },
              { association: "wardNumber", attributes: ["id", "dispName"], required: false },
              { association: "boothNumber", attributes: ["id", "dispName"], required: false }
            ]
          }
        ]
      },
      { association: "wardNumber", attributes: ["id", "dispName"], required: false },
      { association: "boothNumber", attributes: ["id", "dispName"], required: false }
    ]
  });

  const result = new Map<number, RegisteredAttendee[]>();

  for (const registration of registrations) {
    const plainRegistration = registration.get({ plain: true }) as PlainEventRegistration;
    const attendee = toRegisteredAttendee(plainRegistration);
    if (!attendee) {
      continue;
    }

    const existing = result.get(plainRegistration.eventId) ?? [];
    existing.push(attendee);
    result.set(plainRegistration.eventId, existing);
  }

  return result;
};

const isAdmin = (roles: string[]): boolean => {
  const normalizedRoles = roles.map((role) => role.toLowerCase());
  return normalizedRoles.includes(ADMIN_ROLE_NAME.toLowerCase());
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

const parseOptionalString = (
  value: unknown,
  field: string,
  maxLength = REFERRED_BY_MAX_LENGTH
): string | null => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new ApiError(`${field} must be a string`, 400);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (maxLength > 0 && trimmed.length > maxLength) {
    throw new ApiError(`${field} must be at most ${maxLength} characters`, 400);
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

const _parseOptionalTime = (value: unknown, field: string): string | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value !== "string" || !isValidTime(value)) {
    throw new ApiError(`${field} must be a valid time (HH:mm or HH:mm:ss)`, 400);
  }
  return value;
};

const isWithinEventWindow = (event: Event): boolean => {
  const startDate = event.startDate instanceof Date ? event.startDate : new Date(event.startDate);
  const endDate = event.endDate instanceof Date ? event.endDate : new Date(event.endDate);

  const now = new Date();

  const startDateTime = new Date(startDate);
  const endDateTime = new Date(endDate);

  if (event.startTime) {
    const [hours, minutes, seconds] = event.startTime.split(":").map((value) => Number(value));
    startDateTime.setHours(hours ?? 0, minutes ?? 0, seconds ?? 0, 0);
  } else {
    startDateTime.setHours(0, 0, 0, 0);
  }

  if (event.endTime) {
    const [hours, minutes, seconds] = event.endTime.split(":").map((value) => Number(value));
    endDateTime.setHours(hours ?? 23, minutes ?? 59, seconds ?? 59, 999);
  } else {
    endDateTime.setHours(23, 59, 59, 999);
  }

  // return now >= startDateTime && now <= endDateTime;
  return now <= endDateTime;
};

const parseLegacyMediaInput = (mediaInput: unknown): NormalizedMediaInput[] | null => {
  if (mediaInput === undefined || mediaInput === null) {
    return null;
  }

  let arrayInput: unknown[];

  if (typeof mediaInput === "string") {
    const trimmed = mediaInput.trim();
    if (trimmed.length === 0) {
      return null;
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) {
        throw new Error("Expected array");
      }
      arrayInput = parsed;
    } catch {
      throw new ApiError("media must be an array", 400);
    }
  } else if (Array.isArray(mediaInput)) {
    arrayInput = mediaInput;
  } else {
    throw new ApiError("media must be an array", 400);
  }

  const normalized = arrayInput
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const { mediaType, mediaUrl, thumbnailUrl, mimeType, durationSecond, positionNumber } =
        item as Record<string, unknown>;

      if (typeof mediaType !== "string") {
        return null;
      }

      const upperType = mediaType.toUpperCase() as MediaType;
      if (upperType !== MediaType.PHOTO && upperType !== MediaType.VIDEO) {
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

      const normalizedPosition = parseOptionalNumber(positionNumber, "positionNumber") ?? index + 1;

      return {
        mediaType: upperType,
        mediaUrl: mediaUrl.trim(),
        thumbnailUrl: normalizedThumbnail,
        mimeType: normalizedMime,
        durationSecond: normalizedDuration,
        positionNumber: normalizedPosition,
        caption: null
      } as NormalizedMediaInput;
    })
    .filter((value): value is NormalizedMediaInput => value !== null);

  return normalized;
};

const normalizeMediaInput = (
  files: Express.Multer.File[] | undefined,
  mediaInput: unknown
): NormalizedMediaInput[] | null => {
  const uploadedFiles = Array.isArray(files) ? files : [];

  if (uploadedFiles.length > 0) {
    return uploadedFiles.map((file, index) => {
      const isPhoto = file.mimetype.startsWith("image/");
      const mediaType = isPhoto ? MediaType.PHOTO : MediaType.VIDEO;

      return {
        mediaType,
        mediaUrl: buildPublicUploadPath(file.path),
        thumbnailUrl: null,
        mimeType: file.mimetype,
        durationSecond: null,
        positionNumber: index + 1,
        caption: null
      } as NormalizedMediaInput;
    });
  }

  return parseLegacyMediaInput(mediaInput);
};

const computePaginationMeta = (total: number, page: number, limit: number) => ({
  total,
  page,
  pages: Math.ceil(total / limit)
});

const fetchEventById = async (id: number, includeAuditFields?: boolean) => {
  return Event.findOne({
    where: { id, status: 1 },
    attributes: buildEventAttributes(includeAuditFields),
    include: baseEventInclude
  });
};

export const createEvent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);

  assertNoRestrictedFields(req.body);

  const title = parseRequiredString(req.body?.title, "title");
  const description = parseRequiredString(req.body?.description, "description");
  const place = parseRequiredString(req.body?.place, "place");
  const googleMapLink = parseOptionalString(req.body?.googleMapLink, "googleMapLink");
  const latitude = parseRequiredNumber(req.body?.latitude, "latitude");
  const longitude = parseRequiredNumber(req.body?.longitude, "longitude");
  const startDate = parseRequiredDateOnly(req.body?.startDate, "startDate");
  const startTime = parseRequiredTime(req.body?.startTime, "startTime");
  const endDate = parseRequiredDateOnly(req.body?.endDate, "endDate");
  const endTime = parseRequiredTime(req.body?.endTime, "endTime");
  const referredBy = parseOptionalString(req.body?.referredBy, "referredBy");

  const uploadedFiles = Array.isArray(req.files) ? (req.files as Express.Multer.File[]) : undefined;
  const media = normalizeMediaInput(uploadedFiles, req.body?.media);

  const createdEventId = await sequelize.transaction(async (transaction) => {
    const event = await Event.create(
      {
        title,
        description,
        place,
        googleMapLink,
        latitude,
        longitude,
        startDate: new Date(startDate),
        startTime,
        endDate: new Date(endDate),
        endTime,
        referredBy,
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

  // Emit event for push notifications
  console.log("🔔 Emitting EVENT_PUBLISHED event for:", { eventId: createdEventId, title });
  emitEvent(AppEvent.EVENT_PUBLISHED, {
    entityId: createdEventId,
    userId,
    title,
    description,
    place
  });
  console.log("✅ EVENT_PUBLISHED event emitted successfully");

  return sendCreated(res, created, "Event created successfully");
});

export const getEvent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return sendBadRequest(res, "Invalid event id");
  }

  const includeAuditFields = shouldIncludeAuditFields(req.query);
  const eventRecord = await fetchEventById(id, includeAuditFields);
  if (!eventRecord) {
    return sendNotFound(res, "Event not found", "event");
  }

  const event = eventRecord.get({ plain: true });

  const currentUserId = req.user?.id ?? null;

  const registeredUsersMap = await loadRegisteredUsersForEventIds([id]);
  const registeredUsers = registeredUsersMap.get(id) ?? [];

  const isRegistered = currentUserId
    ? registeredUsers.some((attendee) => attendee.id === currentUserId && !attendee.isGuest)
    : false;

  return sendSuccess(
    res,
    {
      ...event,
      registeredUsers,
      isRegistered
    },
    "Event retrieved successfully"
  );
});

export const listEvents = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { page, limit, offset } = parsePaginationParams(
    req.query.page as string | undefined,
    req.query.limit as string | undefined,
    20,
    100
  );
  const currentUserId = req.user?.id ?? null;
  const sortDirection = parseSortDirection(req.query.sort, "ASC");
  const includeAuditFields = shouldIncludeAuditFields(req.query);

  console.log("[listEvents] Query params:", {
    page,
    limit,
    offset,
    sortDirection,
    userId: currentUserId,
    filters: req.query
  });

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
    Object.assign(where, {
      [Op.or]: [
        { title: { [Op.like]: `%${searchTerm}%` } },
        { description: { [Op.like]: `%${searchTerm}%` } }
      ]
    } as WhereOptions);
  }

  if (startDateFrom || startDateTo) {
    where.startDate = {
      ...(startDateFrom ? { [Op.gte]: startDateFrom } : {}),
      ...(startDateTo ? { [Op.lte]: startDateTo } : {})
    };
  }

  const latitudeFilter = parseOptionalNumber(req.query.latitude, "latitude");
  if (latitudeFilter !== null && latitudeFilter !== undefined) {
    where.latitude = latitudeFilter;
  }

  const longitudeFilter = parseOptionalNumber(req.query.longitude, "longitude");
  if (longitudeFilter !== null && longitudeFilter !== undefined) {
    where.longitude = longitudeFilter;
  }

  console.log("[listEvents] WHERE clause:", JSON.stringify(where, null, 2));

  const { rows, count } = await Event.findAndCountAll({
    where,
    limit,
    offset,
    attributes: buildEventAttributes(includeAuditFields, ["startDate", "startTime"]),
    include: baseEventInclude,
    order: [
      ["startDate", sortDirection],
      ["startTime", sortDirection]
    ],
    distinct: true
  });

  console.log("[listEvents] Query results:", { rowCount: rows.length, totalCount: count });

  const plainEvents = rows.map((event) => event.get({ plain: true }));

  const registeredUsersMap = await loadRegisteredUsersForEventIds(
    plainEvents.map((event) => event.id)
  );

  const data = plainEvents.map((event) => {
    const registeredUsers = registeredUsersMap.get(event.id) ?? [];
    const isRegistered = currentUserId
      ? registeredUsers.some((attendee) => attendee.id === currentUserId && !attendee.isGuest)
      : false;

    return {
      ...event,
      registeredUsers,
      isRegistered
    };
  });

  const pagination = calculatePagination(count, page, limit);

  return sendSuccessWithPagination(res, data, pagination, "Events retrieved successfully");
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

    const { page, limit, offset } = parsePaginationParams(
      req.query.page as string | undefined,
      req.query.limit as string | undefined,
      20,
      100
    );

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
          required: false,
          include: [
            {
              association: "profile",
              attributes: ["profileImageUrl"],
              required: false,
              include: [
                { association: "gender", attributes: ["id", "dispName"], required: false },
                { association: "maritalStatus", attributes: ["id", "dispName"], required: false },
                { association: "wardNumber", attributes: ["id", "dispName"], required: false },
                { association: "boothNumber", attributes: ["id", "dispName"], required: false }
              ]
            }
          ]
        },
        { association: "wardNumber", attributes: ["id", "dispName"], required: false },
        { association: "boothNumber", attributes: ["id", "dispName"], required: false }
      ],
      limit,
      offset,
      order: [["createdAt", "DESC"]],
      distinct: true
    });

    const data = rows.map((registration) => {
      const isGuest = !registration.userId;

      return {
        id: registration.id,
        deregisterReason: registration.deregisterReason,
        deregisteredAt: registration.deregisteredAt,
        isGuest,
        user: registration.user
          ? {
              id: registration.user.id,
              fullName: registration.user.fullName,
              email: registration.user.email,
              contactNumber: registration.user.contactNumber,
              profileImageUrl: registration.user.profile?.profileImageUrl ?? null
            }
          : null,
        guestDetails: isGuest
          ? {
              name: registration.fullName,
              contactNumber: registration.contactNumber,
              email: registration.email
            }
          : null
      };
    });

    const pagination = calculatePagination(count, page, limit);

    return sendSuccess(
      res,
      {
        registrations: data,
        includeUnregistered,
        pagination
      },
      "Event registrations retrieved successfully"
    );
  }
);

export const updateEvent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId, roles = [] } = requireAuthenticatedUser(req);

  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw new ApiError("Invalid event id", 400);
  }

  assertNoRestrictedFields(req.body);

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
    updates.googleMapLink = parseOptionalString(req.body.googleMapLink, "googleMapLink");
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "latitude")) {
    updates.latitude = parseRequiredNumber(req.body.latitude, "latitude");
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "longitude")) {
    updates.longitude = parseRequiredNumber(req.body.longitude, "longitude");
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
  if (Object.prototype.hasOwnProperty.call(req.body, "referredBy")) {
    updates.referredBy = parseOptionalString(req.body.referredBy, "referredBy");
  }

  updates.updatedBy = userId;

  const uploadedFiles = Array.isArray(req.files) ? (req.files as Express.Multer.File[]) : undefined;
  const media = normalizeMediaInput(uploadedFiles, req.body?.media);

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
  return sendSuccess(res, updated, "Event updated successfully");
});

export const addEventMedia = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId, roles = [] } = requireAuthenticatedUser(req);

  const eventId = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(eventId)) {
    throw new ApiError("Invalid event id", 400);
  }

  const event = await Event.findOne({ where: { id: eventId, status: 1 } });
  if (!event) {
    throw new ApiError("Event not found", 404);
  }

  if (event.createdBy !== null && event.createdBy !== userId && !isAdmin(roles)) {
    throw new ApiError("Forbidden", 403);
  }

  const uploadedFiles = Array.isArray(req.files) ? (req.files as Express.Multer.File[]) : undefined;
  const media = normalizeMediaInput(uploadedFiles, req.body?.media);

  if (!media || media.length === 0) {
    throw new ApiError("At least one media file is required", 400);
  }

  const [existingImageCount, existingVideoCount, existingMaxPositionRaw] = await Promise.all([
    EventMedia.count({
      where: { eventId, status: 1, mediaType: MediaType.PHOTO }
    }),
    EventMedia.count({
      where: { eventId, status: 1, mediaType: MediaType.VIDEO }
    }),
    EventMedia.max("positionNumber", {
      where: { eventId, status: 1 }
    }) as Promise<number | null>
  ]);

  const newImageCount = media.filter((item) => item.mediaType === MediaType.PHOTO).length;
  const newVideoCount = media.filter((item) => item.mediaType === MediaType.VIDEO).length;

  if (existingImageCount + newImageCount > MAX_EVENT_IMAGE_COUNT) {
    throw new ApiError(`An event can include at most ${MAX_EVENT_IMAGE_COUNT} images`, 400);
  }

  if (existingVideoCount + newVideoCount > MAX_EVENT_VIDEO_COUNT) {
    throw new ApiError(`An event can include at most ${MAX_EVENT_VIDEO_COUNT} video`, 400);
  }

  const startingPosition = Number.isFinite(existingMaxPositionRaw ?? NaN)
    ? (existingMaxPositionRaw as number)
    : 0;

  await sequelize.transaction(async (transaction) => {
    await EventMedia.bulkCreate(
      media.map((item, index) => ({
        eventId: event.id,
        mediaType: item.mediaType,
        mediaUrl: item.mediaUrl,
        thumbnailUrl: item.thumbnailUrl,
        mimeType: item.mimeType,
        durationSecond: item.durationSecond,
        positionNumber: startingPosition + index + 1,
        caption: item.caption,
        status: 1,
        createdBy: event.createdBy ?? userId,
        updatedBy: userId
      })),
      { transaction }
    );
  });

  const updated = await fetchEventById(event.id);
  return sendCreated(res, updated, "Media added to event successfully");
});

export const removeEventMedia = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId, roles = [] } = requireAuthenticatedUser(req);

  const eventId = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(eventId)) {
    throw new ApiError("Invalid event id", 400);
  }

  const event = await Event.findOne({ where: { id: eventId, status: 1 } });
  if (!event) {
    throw new ApiError("Event not found", 404);
  }

  if (event.createdBy !== null && event.createdBy !== userId && !isAdmin(roles)) {
    throw new ApiError("Forbidden", 403);
  }

  const mediaIdsInput = req.body?.mediaIds ?? req.body?.ids;
  if (!Array.isArray(mediaIdsInput) || mediaIdsInput.length === 0) {
    throw new ApiError("mediaIds must be a non-empty array", 400);
  }

  const mediaIds = mediaIdsInput
    .map((value) => Number.parseInt(String(value), 10))
    .filter((value) => Number.isInteger(value) && value > 0);

  if (mediaIds.length === 0) {
    throw new ApiError("mediaIds must contain valid numeric identifiers", 400);
  }

  await sequelize.transaction(async (transaction) => {
    await EventMedia.update(
      { status: 0, updatedBy: userId },
      {
        where: {
          id: { [Op.in]: mediaIds },
          eventId: event.id,
          status: 1
        },
        transaction
      }
    );
  });

  const updated = await fetchEventById(event.id);
  return sendSuccess(res, updated, "Media removed from event successfully");
});

export const deleteEvent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId, roles = [] } = requireAuthenticatedUser(req);

  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return sendBadRequest(res, "Invalid event id");
  }

  const event = await Event.findOne({ where: { id, status: 1 } });
  if (!event) {
    return sendNotFound(res, "Event not found", "event");
  }

  if (event.createdBy !== null && event.createdBy !== userId && !isAdmin(roles)) {
    return sendForbidden(res, "You don't have permission to delete this event");
  }

  const timestamp = new Date();

  await sequelize.transaction(async (transaction) => {
    await event.update({ status: 0, updatedBy: userId }, { transaction });
    await EventMedia.update(
      { status: 0, updatedBy: userId },
      { where: { eventId: event.id }, transaction }
    );
    await EventRegistration.update(
      {
        status: 0,
        updatedBy: userId,
        deregisterReason: "Event cancelled by organizer",
        deregisteredAt: timestamp
      },
      { where: { eventId: event.id, status: 1 }, transaction }
    );
  });

  return sendNoContent(res);
});

export const registerForEvent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: loggedInUserId } = requireAuthenticatedUser(req);

  const eventId = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(eventId)) {
    return sendBadRequest(res, "Invalid event id");
  }

  const event = await Event.findOne({ where: { id: eventId, status: 1 } });
  if (!event) {
    return sendNotFound(res, "Event not found", "event");
  }

  if (!isWithinEventWindow(event)) {
    return sendBadRequest(res, "Event registration window is closed for this event");
  }

  // Parse and validate all fields - fullName and contactNumber are mandatory
  const parsedUserId =
    req.body.userId !== undefined && req.body.userId !== null && req.body.userId !== ""
      ? parseRequiredNumber(req.body.userId, "userId")
      : null;

  const parsedFullName = parseRequiredString(req.body.fullName, "fullName");
  const parsedContactNumber = parseRequiredString(req.body.contactNumber, "contactNumber");
  const parsedEmail = parseOptionalString(req.body.email, "email", 255);
  const parsedRegisteredBy = parseOptionalString(req.body.registeredBy, "registeredBy");
  const parsedFullAddress = parseOptionalString(req.body.fullAddress, "fullAddress");
  const parsedWardNumberId = parseOptionalNumber(req.body.wardNumberId, "wardNumberId");
  const parsedBoothNumberId = parseOptionalNumber(req.body.boothNumberId, "boothNumberId");
  const parsedDateOfBirth = parseOptionalDateOnly(req.body.dateOfBirth, "dateOfBirth");
  const parsedAge = parseOptionalNumber(req.body.age, "age");

  // Check for existing registration - uniqueness by eventId + userId OR eventId + contactNumber
  let existingRegistration = null;

  if (parsedUserId) {
    existingRegistration = await EventRegistration.findOne({
      where: { eventId, userId: parsedUserId }
    });
  } else if (parsedContactNumber) {
    existingRegistration = await EventRegistration.findOne({
      where: { eventId, contactNumber: parsedContactNumber }
    });
  }

  // Prepare registration data
  const registrationData = {
    eventId,
    userId: parsedUserId,
    fullName: parsedFullName,
    contactNumber: parsedContactNumber,
    email: parsedEmail,
    registeredBy: parsedRegisteredBy,
    fullAddress: parsedFullAddress,
    wardNumberId: parsedWardNumberId,
    boothNumberId: parsedBoothNumberId,
    dateOfBirth: parsedDateOfBirth ? new Date(parsedDateOfBirth) : null,
    age: parsedAge,
    status: 1,
    deregisterReason: null,
    deregisteredAt: null,
    createdBy: loggedInUserId,
    updatedBy: loggedInUserId
  };

  if (existingRegistration) {
    if (existingRegistration.status === 1) {
      return sendConflict(res, "Already registered for this event");
    }

    // Reactivate with new data
    await existingRegistration.update(registrationData);

    return sendSuccess(
      res,
      {
        id: existingRegistration.id,
        eventId: existingRegistration.eventId,
        isGuest: !parsedUserId
      },
      "Registration reactivated"
    );
  }

  // Create new registration
  const registration = await EventRegistration.create(registrationData);

  return sendCreated(
    res,
    {
      id: registration.id,
      eventId: registration.eventId,
      isGuest: !parsedUserId
    },
    "Registered successfully"
  );
});

export const unregisterFromEvent = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id: userId } = requireAuthenticatedUser(req);

    const eventId = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(eventId)) {
      return sendBadRequest(res, "Invalid event id");
    }

    const event = await Event.findOne({ where: { id: eventId, status: 1 } });
    if (!event) {
      return sendNotFound(res, "Event not found", "event");
    }

    if (!isWithinEventWindow(event)) {
      return sendBadRequest(res, "Event unregistration is only allowed during the event window");
    }

    const registration = await EventRegistration.findOne({
      where: {
        eventId,
        userId,
        status: 1
      }
    });

    if (!registration) {
      return sendNotFound(res, "Active registration not found");
    }

    const { reason } = req.body as { reason?: string };
    const normalizedReason = typeof reason === "string" && reason.trim().length > 0 ? reason : null;

    await registration.update({
      status: 0,
      deregisterReason: normalizedReason,
      deregisteredAt: new Date(),
      updatedBy: userId
    });

    return sendSuccess(res, {}, "Unregistered successfully");
  }
);

export const unregisterRegistration = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id: userId } = requireAuthenticatedUser(req);

    const registrationId = Number.parseInt(req.params.registrationId, 10);
    if (Number.isNaN(registrationId)) {
      return sendBadRequest(res, "Invalid registration id");
    }

    const registration = await EventRegistration.findOne({
      where: {
        id: registrationId,
        status: 1
      },
      include: [
        {
          association: "event",
          attributes: ["id", "status", "startDate", "startTime", "endDate", "endTime"],
          required: true
        }
      ]
    });

    if (!registration) {
      return sendNotFound(res, "Active registration not found");
    }

    const event = registration.event;
    if (!event || event.status !== 1) {
      return sendNotFound(res, "Event not found or inactive");
    }

    // Check if user has permission to unregister
    // They can unregister if:
    // 1. It's their own registration (userId matches), OR
    // 2. For guest registrations, check if registeredBy matches (if registeredBy is numeric)
    const canUnregister =
      (registration.userId !== null && registration.userId === userId) ||
      (registration.userId === null &&
        registration.registeredBy &&
        !Number.isNaN(Number(registration.registeredBy)) &&
        Number(registration.registeredBy) === userId);

    if (!canUnregister) {
      return sendForbidden(res, "You don't have permission to unregister this registration");
    }

    if (!isWithinEventWindow(event)) {
      return sendBadRequest(res, "Event unregistration is only allowed during the event window");
    }

    const { reason } = req.body as { reason?: string };
    const normalizedReason = typeof reason === "string" && reason.trim().length > 0 ? reason : null;

    await registration.update({
      status: 0,
      deregisterReason: normalizedReason,
      deregisteredAt: new Date(),
      updatedBy: userId
    });

    const isGuest = !registration.userId;
    return sendSuccess(
      res,
      {},
      isGuest ? "Guest unregistered successfully" : "Unregistered successfully"
    );
  }
);
