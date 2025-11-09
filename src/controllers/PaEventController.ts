import { Request, Response } from "express";
import { Op } from "sequelize";
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
import sequelize from "../config/database";

// ✅ Common exclude list
const excludeFields = ["createdBy", "updatedBy", "status", "createdAt", "updatedAt"];

export const createPaEvent = asyncHandler(async (req: Request, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);
  const { title, description, startDate, startTime, endDate, endTime } = req.body;

  const validationErrors = [];
  if (!title) validationErrors.push({ field: "title", message: "Title is required" });
  if (!startDate) validationErrors.push({ field: "startDate", message: "Start date is required" });
  if (!startTime) validationErrors.push({ field: "startTime", message: "Start time is required" });
  if (!endDate) validationErrors.push({ field: "endDate", message: "End date is required" });
  if (!endTime) validationErrors.push({ field: "endTime", message: "End time is required" });

  if (validationErrors.length > 0) {
    return sendValidationError(res, "Validation failed", validationErrors);
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return sendValidationError(res, "Invalid date format provided", [
      { field: "startDate/endDate", message: "Please provide valid date strings (YYYY-MM-DD)" }
    ]);
  }

  const event = await PaEvent.create({
    title,
    description,
    startDate: start,
    startTime,
    endDate: end,
    endTime,
    createdBy: userId,
    updatedBy: userId,
    status: 1
  });

  const responseData = Object.fromEntries(
    Object.entries(event.toJSON()).filter(([key]) => !excludeFields.includes(key))
  );

  return sendCreated(res, responseData, "Event created successfully");
});

const parseSortDirection = (
  value: unknown,
  defaultDirection: "ASC" | "DESC" = "ASC"
): "ASC" | "DESC" => {
  if (typeof value !== "string") return defaultDirection;
  const normalized = value.trim().toUpperCase();
  return normalized === "ASC" || normalized === "DESC" ? normalized : defaultDirection;
};

const PAGE_DEFAULT = 1;
const LIMIT_DEFAULT = 10;
const LIMIT_MAX = 100;

const parsePagination = (req: Request) => {
  const page = Number.parseInt((req.query.page as string) ?? `${PAGE_DEFAULT}`, 10);
  const limit = Number.parseInt((req.query.limit as string) ?? `${LIMIT_DEFAULT}`, 10);
  const safePage = Number.isNaN(page) || page <= 0 ? PAGE_DEFAULT : page;
  const safeLimit = Number.isNaN(limit) || limit <= 0 ? LIMIT_DEFAULT : Math.min(limit, LIMIT_MAX);
  return { page: safePage, limit: safeLimit, offset: (safePage - 1) * safeLimit };
};

export const listPaEvents = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = parsePagination(req);
  const sortDirection = parseSortDirection(req.query.sort, "ASC");

  const where: any = {};

  const search = (req.query.search as string | undefined)?.trim();
  const status = req.query.status ? Number(req.query.status) : undefined;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;

  if (status !== undefined && !Number.isNaN(status)) where.status = status;
  if (search) where.title = { [Op.like]: `%${search}%` };

  if (startDate && endDate) {
    where.startDate = { [Op.between]: [startDate, endDate] };
  } else if (startDate) {
    where.startDate = startDate;
  }

  const { rows, count } = await PaEvent.findAndCountAll({
    where,
    attributes: { exclude: excludeFields },
    order: [
      ["startDate", sortDirection],
      ["startTime", sortDirection]
    ],
    limit,
    offset,
    distinct: true
  });

  const pagination = calculatePagination(count, page, limit);

  return sendSuccessWithPagination(
    res,
    rows,
    pagination,
    rows.length ? "Events fetched successfully" : "No events found"
  );
});

export const getPaEventById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const event = await PaEvent.findOne({
    where: { id, status: 1 },
    attributes: { exclude: excludeFields }
  });

  if (!event) throw new ApiError("Event not found or inactive", 404);

  return sendSuccess(res, event, "Event fetched successfully");
});

export const updatePaEvent = asyncHandler(async (req: Request, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);
  const { id } = req.params;
  const { title, description, startDate, startTime, endDate, endTime, status } = req.body;

  const event = await PaEvent.findOne({ where: { id, status: 1 } });
  if (!event) throw new ApiError("Event not found or inactive", 404);

  await sequelize.transaction(async (transaction) => {
    await event.update(
      {
        title,
        description,
        startDate,
        startTime,
        endDate,
        endTime,
        status,
        updatedBy: userId
      },
      { transaction }
    );
  });

  const updatedEvent = await PaEvent.findByPk(id, {
    attributes: { exclude: excludeFields }
  });

  return sendSuccess(res, updatedEvent, "Event updated successfully");
});

export const deletePaEvent = asyncHandler(async (req: Request, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);
  const { id } = req.params;

  const event = await PaEvent.findOne({ where: { id, status: 1 } });
  if (!event) throw new ApiError("Event not found or already deleted", 404);

  await event.update({ status: 0, updatedBy: userId });

  return sendSuccess(res, null, "Event deleted successfully");
});
