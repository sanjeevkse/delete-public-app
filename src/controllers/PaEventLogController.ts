import { Request, Response } from "express";
import { WhereOptions } from "sequelize";

import asyncHandler from "../utils/asyncHandler";
import { ApiError } from "../middlewares/errorHandler";
import { calculatePagination, sendSuccess, sendSuccessWithPagination } from "../utils/apiResponse";
import PaEventLog from "../models/PaEventLog";

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

export const listPaEventLogs = asyncHandler(async (req: Request, res: Response) => {
  const eventId = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(eventId)) {
    throw new ApiError("Invalid event id", 400);
  }

  const { page, limit, offset } = parsePagination(req);
  const where: WhereOptions = { eventId };
  const statusParam = req.query.status as string | undefined;

  if (statusParam !== undefined) {
    const parsedStatus = Number(statusParam);
    if (!Number.isNaN(parsedStatus)) {
      where.status = parsedStatus;
    }
  }

  const { rows, count } = await PaEventLog.findAndCountAll({
    where,
    order: [["createdAt", "DESC"]],
    limit,
    offset,
    include: [
      {
        association: "actor",
        attributes: ["id", "fullName", "email"],
        required: false
      }
    ]
  });

  const pagination = calculatePagination(count, page, limit);
  const data = rows.map((log) => log.get({ plain: true }));

  return sendSuccessWithPagination(
    res,
    data,
    pagination,
    data.length ? "Event logs fetched successfully" : "No event logs found"
  );
});

export const getPaEventLogById = asyncHandler(async (req: Request, res: Response) => {
  const logId = Number.parseInt(req.params.logId, 10);
  if (Number.isNaN(logId)) {
    throw new ApiError("Invalid log id", 400);
  }

  const log = await PaEventLog.findOne({
    where: { id: logId },
    include: [
      {
        association: "event",
        attributes: [
          "id",
          "bossId",
          "title",
          "startDate",
          "startTime",
          "endDate",
          "endTime",
          "status"
        ],
        required: false
      },
      {
        association: "actor",
        attributes: ["id", "fullName", "email"],
        required: false
      }
    ]
  });

  if (!log) {
    throw new ApiError("Log entry not found", 404);
  }

  return sendSuccess(res, log.get({ plain: true }), "Log entry fetched successfully");
});
