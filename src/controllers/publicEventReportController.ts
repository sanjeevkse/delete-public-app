import type { Response } from "express";
import { Op } from "sequelize";

import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { ApiError } from "../middlewares/errorHandler";
import asyncHandler from "../utils/asyncHandler";
import { sendSuccess } from "../utils/apiResponse";
import Event from "../models/Event";
import EventRegistration from "../models/EventRegistration";
import User from "../models/User";

const formatDateTime = (value: Date | string | null | undefined): string | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const pad2 = (num: number) => String(num).padStart(2, "0");
  const dd = pad2(date.getDate());
  const mm = pad2(date.getMonth() + 1);
  const yyyy = date.getFullYear();
  const hh = pad2(date.getHours());
  const min = pad2(date.getMinutes());
  const ss = pad2(date.getSeconds());
  return `${dd}-${mm}-${yyyy} ${hh}:${min}:${ss}`;
};

const toDateOnly = (value: Date): string => {
  const pad2 = (num: number) => String(num).padStart(2, "0");
  return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
};

const parseRequiredNumber = (raw: string | undefined, fieldLabel: string): number => {
  if (!raw) {
    throw new ApiError(`${fieldLabel} is required`, 400);
  }
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) {
    throw new ApiError(`Invalid ${fieldLabel}`, 400);
  }
  return Math.trunc(num);
};

const parseWardBoothFilter = (raw: string | undefined, fieldLabel: string): number | undefined => {
  if (raw === undefined || raw === "") return undefined;
  const num = Number(raw);
  if (!Number.isFinite(num)) {
    throw new ApiError(`Invalid ${fieldLabel}`, 400);
  }
  const normalized = Math.trunc(num);
  if (normalized === -1) return -1;
  if (normalized <= 0) {
    throw new ApiError(`Invalid ${fieldLabel}`, 400);
  }
  return normalized;
};

const buildPublicEventMetrics = async () => {
  const now = new Date();
  const todayDateOnly = toDateOnly(now);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const [totalEvents, registeredUsers, upcomingEvents, eventsThisMonth, eventsThisWeek] =
    await Promise.all([
      Event.count({ where: { status: 1 } }),
      EventRegistration.count({ where: { status: 1 } }),
      Event.count({
        where: {
          status: 1,
          startDate: { [Op.gt]: todayDateOnly }
        }
      }),
      Event.count({
        where: {
          status: 1,
          startDate: { [Op.between]: [toDateOnly(startOfMonth), toDateOnly(endOfMonth)] }
        }
      }),
      Event.count({
        where: {
          status: 1,
          startDate: { [Op.between]: [toDateOnly(startOfWeek), toDateOnly(endOfWeek)] }
        }
      })
    ]);

  return {
    totalEvents,
    registeredUsers,
    upcomingEvents,
    eventsThisMonth,
    eventsThisWeek
  };
};

/**
 * Public events report with metrics and tabular registration data
 * GET /reports/public-events
 * Query params:
 *   - eventId (required)
 *   - wardNumberId (optional, -1 for all)
 *   - boothNumberId (optional, -1 for all)
 */
export const getPublicEventsReport = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const eventIdRaw = typeof req.query.eventId === "string" ? req.query.eventId : undefined;
    const wardNumberRaw = typeof req.query.wardNumberId === "string" ? req.query.wardNumberId : undefined;
    const boothNumberRaw =
      typeof req.query.boothNumberId === "string" ? req.query.boothNumberId : undefined;

    const eventId = parseRequiredNumber(eventIdRaw, "eventId");
    const wardNumberId = parseWardBoothFilter(wardNumberRaw, "wardNumberId");
    const boothNumberId = parseWardBoothFilter(boothNumberRaw, "boothNumberId");

    const event = await Event.findOne({ where: { id: eventId } });
    if (!event) {
      throw new ApiError("Event not found", 404);
    }

    const registrationWhere: Record<string, unknown> = {
      eventId,
      status: 1
    };

    if (wardNumberId !== undefined && wardNumberId !== -1) {
      registrationWhere.wardNumberId = wardNumberId;
    }

    if (boothNumberId !== undefined && boothNumberId !== -1) {
      registrationWhere.boothNumberId = boothNumberId;
    }

    const registrations = await EventRegistration.findAll({
      where: registrationWhere,
      include: [
        {
          association: "user",
          attributes: ["id", "fullName", "email", "contactNumber"],
          required: false
        },
        { association: "wardNumber", attributes: ["id", "dispName"], required: false },
        { association: "boothNumber", attributes: ["id", "dispName"], required: false },
        { association: "designation", attributes: ["id", "dispName"], required: false }
      ],
      order: [["createdAt", "DESC"]]
    });

    const createdByIds = Array.from(
      new Set(registrations.map((registration) => registration.createdBy).filter(Boolean))
    ) as number[];
    const createdByUsers = createdByIds.length
      ? await User.findAll({
          where: { id: { [Op.in]: createdByIds } },
          attributes: ["id", "fullName", "email", "contactNumber"],
          raw: true
        })
      : [];

    const createdByLookup = new Map<number, string>();
    for (const user of createdByUsers as Array<any>) {
      const label = user.fullName || user.email || user.contactNumber || String(user.id);
      createdByLookup.set(Number(user.id), label);
    }

    const headers = [
      "SL No.",
      "Name",
      "Mobile",
      "Email",
      "Ward",
      "Booth",
      "Designation",
      "Registered By",
      "Created By",
      "Registered At",
      "Status"
    ];

    type TabularCell = string | number | null;
    const tabularRows: TabularCell[][] = registrations.map((registration, index) => {
      const user = registration.user;
      const name = user?.fullName ?? registration.fullName ?? null;
      const mobile = user?.contactNumber ?? registration.contactNumber ?? null;
      const email = user?.email ?? registration.email ?? null;
      const wardLabel = registration.wardNumber?.dispName ??
        (registration.wardNumberId ? String(registration.wardNumberId) : null);
      const boothLabel = registration.boothNumber?.dispName ??
        (registration.boothNumberId ? String(registration.boothNumberId) : null);
      const designationLabel = registration.designation?.dispName ?? null;
      const createdByLabel = registration.createdBy
        ? createdByLookup.get(Number(registration.createdBy)) ?? String(registration.createdBy)
        : null;

      return [
        index + 1,
        name,
        mobile,
        email,
        wardLabel,
        boothLabel,
        designationLabel,
        registration.registeredBy ?? null,
        createdByLabel,
        formatDateTime(registration.createdAt ?? null),
        registration.status ?? null
      ];
    });

    const metrics = await buildPublicEventMetrics();

    const reportData = {
      filters: {
        eventId,
        wardNumberId: wardNumberId ?? null,
        boothNumberId: boothNumberId ?? null
      },
      event: {
        id: event.id,
        title: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
        status: event.status
      },
      metrics,
      tabularData: {
        headers,
        data: tabularRows
      }
    };

    return sendSuccess(res, reportData, "Public events report retrieved successfully");
  }
);

/**
 * Public events metrics (no eventId required)
 * GET /reports/public-events/metrics
 */
export const getPublicEventsMetrics = asyncHandler(
  async (_req: AuthenticatedRequest, res: Response) => {
    const metrics = await buildPublicEventMetrics();
    return sendSuccess(res, { metrics }, "Public events metrics retrieved successfully");
  }
);

export default { getPublicEventsReport, getPublicEventsMetrics };
