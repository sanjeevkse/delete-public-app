import { Request, Response } from "express";
import { Op } from "sequelize";
import asyncHandler from "../utils/asyncHandler";
import { ApiError } from "../middlewares/errorHandler";
import { sendSuccess, sendCreated } from "../utils/apiResponse";
import { requireAuthenticatedUser } from "../middlewares/authMiddleware";
import PaEvent from "../models/PaEvent";
import sequelize from "../config/database";

// ✅ Common exclude list
const excludeFields = [
  "createdBy",
  "updatedBy",
  "status",
  "createdAt",
  "updatedAt"
];

// ✅ CREATE
export const createPaEvent = asyncHandler(async (req: Request, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);
  const { title, description, startDate, startTime, endDate, endTime } = req.body;

  if (!title || !startDate || !startTime) {
    throw new ApiError("Title, startDate, and startTime are required", 400);
  }

  const event = await PaEvent.create({
    title,
    description,
    startDate,
    startTime,
    endDate,
    endTime,
    createdBy: userId,
    updatedBy: userId,
    status: 1,
  });

  return sendCreated(res, event, "Event created successfully");
});

export const listPaEvents = asyncHandler(async (req: Request, res: Response) => {
  const {
    page = 1,
    pageSize = 10,
    search,
    status,
    startDate,
    endDate,
  } = req.query as any;

  const where: any = { status: 1 };

  if (status !== undefined) where.status = status;
  if (search) where.title = { [Op.like]: `%${search}%` };
  if (startDate && endDate) {
    where.startDate = { [Op.between]: [startDate, endDate] };
  } else if (startDate) {
    where.startDate = startDate;
  }

  const offset = (Number(page) - 1) * Number(pageSize);

  const { rows, count } = await PaEvent.findAndCountAll({
    where,
    order: [
      ["startDate", "ASC"],
      ["startTime", "ASC"],
    ],
    limit: Number(pageSize),
    offset,
    attributes: { exclude: excludeFields },
  });

  const pagination = {
    page: Number(page),
    limit: Number(pageSize),
    total: count,
    totalPages: Math.ceil(count / Number(pageSize)),
  };

  return sendSuccess(res, { events: rows, pagination }, "Events fetched successfully");
});

export const getPaEventById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const event = await PaEvent.findOne({
    where: { id, status: 1 },
    attributes: { exclude: excludeFields },
  });

  if (!event) throw new ApiError("Event not found or inactive", 404);

  return sendSuccess(res, event, "Event fetched successfully");
});

export const updatePaEvent = asyncHandler(async (req: Request, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);
  const { id } = req.params;
  const {
    title,
    description,
    startDate,
    startTime,
    endDate,
    endTime,
    status,
  } = req.body;

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
        updatedBy: userId,
      },
      { transaction }
    );
  });

  const updatedEvent = await PaEvent.findByPk(id, {
    attributes: { exclude: excludeFields },
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
