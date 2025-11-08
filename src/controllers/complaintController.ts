import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import { sendCreated, sendSuccess, calculatePagination, sendSuccessWithPagination } from "../utils/apiResponse";
import { ApiError } from "../middlewares/errorHandler";
import sequelize from "../config/database";
import Complaint from "../models/Complaint";
import ComplaintMedia from "../models/ComplaintMedia";
import ComplaintType from "../models/ComplaintType";
import { requireAuthenticatedUser } from "../middlewares/authMiddleware";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { MediaType } from "../types/enums";
import { Sequelize, Op } from "sequelize";
import { buildPublicUploadPath } from "../middlewares/uploadMiddleware";

// ✅ Common attributes to exclude
const excludeFields = ["createdBy", "updatedBy", "status", "createdAt", "updatedAt"];

export const createComplaint = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);
  const { selfOther, complaintTypeId, title, description, locationText, latitude, longitude, landmark } = req.body;

  const mediaFiles = req.files as Express.Multer.File[] | undefined;
  const complaintType = await ComplaintType.findOne({ where: { id: complaintTypeId, status: 1 } });
  if (!complaintType) throw new ApiError("Invalid complaint type", 400);

  const complaint = await sequelize.transaction(async (transaction) => {
    const newComplaint = await Complaint.create(
      {
        selfOther,
        complaintTypeId,
        title,
        description,
        locationText,
        latitude,
        longitude,
        landmark,
        createdBy: userId,
        updatedBy: userId
      },
      { transaction }
    );

    // ✅ Add media if any
    if (mediaFiles?.length) {
      const mediaData = mediaFiles.map((file, idx) => ({
        complaintId: newComplaint.id,
        mediaType: file.mimetype.startsWith("video") ? MediaType.VIDEO : MediaType.PHOTO,
        mediaUrl: buildPublicUploadPath(file.path),
        thumbnailUrl: null,
        mimeType: file.mimetype,
        positionNumber: idx + 1,
        createdBy: userId,
        updatedBy: userId,
        status: 1
      }));
      await ComplaintMedia.bulkCreate(mediaData, { transaction });
    }

    return newComplaint;
  });

  const result = await Complaint.findByPk(complaint.id, {
    attributes: { exclude: excludeFields },
    include: [
      {
        model: ComplaintMedia,
        as: "media",
        where: { status: 1 },
        required: false,
        attributes: { exclude: excludeFields }
      },
      { model: ComplaintType, as: "complaintType", attributes: ["id", "dispName"] }
    ]
  });

  return sendCreated(res, result, "Complaint created successfully");
});

export const getComplaintById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const complaint = await Complaint.findByPk(id, {
    attributes: { exclude: excludeFields },
    include: [
      {
        model: ComplaintMedia,
        as: "media",
        where: { status: 1 },
        required: false,
        attributes: { exclude: excludeFields }
      },
      {
        model: ComplaintType,
        as: "complaintType",
        attributes: ["id", "dispName"]
      }
    ]
  });

  if (!complaint) throw new ApiError("Complaint not found", 404);

  const baseUrl = process.env.PUBLIC_BASE_URL || "https://public.nammarajajinagar.com";
  const complaintJson: any = complaint.toJSON();

  const makeFullUrl = (url: string | null) => {
    if (!url) return null;
    return url.startsWith("http") ? url : `${baseUrl}${url}`;
  };

  complaintJson.media = (complaintJson.media || []).map((m: any) => ({
    ...m,
    mediaUrl: makeFullUrl(m.mediaUrl),
    thumbnailUrl: makeFullUrl(m.thumbnailUrl)
  }));

  return sendSuccess(res, complaintJson, "Complaint fetched successfully");
});

const parseSortDirection = (
  value: unknown,
  defaultDirection: "ASC" | "DESC" = "DESC"
): "ASC" | "DESC" => {
  if (typeof value !== "string") {
    return defaultDirection;
  }
  const normalized = value.trim().toUpperCase();
  if (normalized === "ASC" || normalized === "DESC") {
    return normalized;
  }
  return defaultDirection;
};

const PAGE_DEFAULT = 1;
const LIMIT_DEFAULT = 10;
const LIMIT_MAX = 100;

const parsePagination = (req: Request) => {
  const page = Number.parseInt((req.query.page as string) ?? `${PAGE_DEFAULT}`, 10);
  const limit = Number.parseInt((req.query.limit as string) ?? `${LIMIT_DEFAULT}`, 10);

  const safePage = Number.isNaN(page) || page <= 0 ? PAGE_DEFAULT : page;
  const safeLimit = Number.isNaN(limit) || limit <= 0 ? LIMIT_DEFAULT : Math.min(limit, LIMIT_MAX);

  return {
    page: safePage,
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit
  };
};

export const listComplaints = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { page, limit, offset } = parsePagination(req);
  const sortDirection = parseSortDirection(req.query.sort, "DESC");

  const where: any = { status: 1 };

  const searchTerm = (req.query.search as string | undefined)?.trim();
  const complaintTypeId = req.query.complaintTypeId ? Number(req.query.complaintTypeId) : undefined;
  const selfOther = (req.query.selfOther as string | undefined)?.trim();

  if (complaintTypeId && !Number.isNaN(complaintTypeId)) {
    where.complaintTypeId = complaintTypeId;
  }

  if (selfOther) {
    where.selfOther = selfOther;
  }

  if (searchTerm) {
    where[Op.or] = [
      { title: { [Op.like]: `%${searchTerm}%` } },
      { description: { [Op.like]: `%${searchTerm}%` } },
    ];
  }

  const { rows, count } = await Complaint.findAndCountAll({
    where,
    attributes: { exclude: excludeFields },
    include: [
      {
        model: ComplaintMedia,
        as: "media",
        where: { status: 1 },
        required: false,
        attributes: {
          exclude: ["createdBy", "updatedBy", "status", "createdAt", "updatedAt"],
        },
      },
    ],
    order: [["id", sortDirection]],
    limit,
    offset,
    distinct: true,
  });

  const complaintsJSON = rows.map((c: any) => c.toJSON());
  const complaintTypeIds = [...new Set(complaintsJSON.map((c: any) => c.complaintTypeId))];

  const types = await ComplaintType.findAll({
    where: { id: complaintTypeIds },
    attributes: ["id", "dispName"],
  });

  const typeMap = types.reduce((acc, t) => {
    acc[t.id] = { id: t.id, dispName: t.dispName };
    return acc;
  }, {} as Record<number, { id: number; dispName: string }>);

  const baseUrl = process.env.PUBLIC_BASE_URL || "https://public.nammarajajinagar.com";

  const data = complaintsJSON.map((c: any) => {
    const mediaRecords = Array.isArray(c.media) ? c.media : [];

    const formattedMedia = mediaRecords.map((m: any) => {
      const makeFullUrl = (url: string | null) => {
        if (!url) return null;
        return url.startsWith("http") ? url : `${baseUrl}${url}`;
      };

      return {
        ...m,
        mediaUrl: makeFullUrl(m.mediaUrl),
        thumbnailUrl: makeFullUrl(m.thumbnailUrl),
      };
    });

    return {
      id: c.id,
      selfOther: c.selfOther,
      complaintTypeId: c.complaintTypeId,
      title: c.title,
      description: c.description,
      locationText: c.locationText,
      latitude: c.latitude,
      longitude: c.longitude,
      landmark: c.landmark,
      media: formattedMedia,
      complaintType: typeMap[c.complaintTypeId] || null,
    };
  });

  const pagination = calculatePagination(count, page, limit);

  return sendSuccessWithPagination(
    res,
    data,
    pagination,
    data.length ? "Complaints listed successfully" : "No complaints found"
  );
});

export const updateComplaint = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);
  const { id } = req.params;

  const complaint = await Complaint.findOne({ where: { id } });
  if (!complaint) throw new ApiError("Complaint not found", 404);

  // Only update complaint fields — ignore media
  const updates: Record<string, any> = {};
  const allowedFields = [
    "title",
    "description",
    "locationText",
    "latitude",
    "longitude",
    "landmark",
    "selfOther",
    "complaintTypeId"
  ];

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      updates[field] = req.body[field];
    }
  }

  updates.updatedBy = userId;

  await sequelize.transaction(async (transaction) => {
    await complaint.update(updates, { transaction });
  });

  const updatedComplaint = await Complaint.findByPk(id, {
    attributes: { exclude: excludeFields },
    include: [
      {
        model: ComplaintMedia,
        as: "media",
        where: { status: 1 },
        required: false,
        attributes: { exclude: excludeFields }
      },
      {
        model: ComplaintType,
        as: "complaintType",
        attributes: ["id", "dispName"]
      }
    ]
  });

  const baseUrl = process.env.PUBLIC_BASE_URL || "https://public.nammarajajinagar.com";
  const complaintJson: any = updatedComplaint ? updatedComplaint.toJSON() : null;

  if (complaintJson?.media?.length) {
    complaintJson.media = complaintJson.media.map((m: any) => {
      const formatUrl = (url: string | null) => {
        if (!url) return null;
        return url.startsWith(baseUrl) ? url : `${baseUrl}${url}`;
      };

      return {
        ...m,
        mediaUrl: formatUrl(m.mediaUrl),
        thumbnailUrl: formatUrl(m.thumbnailUrl)
      };
    });
  }

  return sendSuccess(res, complaintJson, "Complaint updated successfully");
});


export const deleteComplaint = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);
  const { id } = req.params;

  const complaint = await Complaint.findByPk(id);
  if (!complaint) throw new ApiError("Complaint not found", 404);

  // Soft delete: set status to 0
  await complaint.update({ status: 0, updatedBy: userId });

  return sendSuccess(res, null, "Complaint deleted successfully");
});

export const addComplaintMedia = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);

  const complaintId = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(complaintId)) {
    throw new ApiError("Invalid complaint id", 400);
  }

  const complaint = await Complaint.findOne({ where: { id: complaintId, status: 1 } });
  if (!complaint) {
    throw new ApiError("Complaint not found", 404);
  }

  const uploadedFiles = Array.isArray(req.files)
    ? (req.files as Express.Multer.File[])
    : [];

  const media = [
    ...(req.body?.media ?? []),
    ...uploadedFiles.map((file) => ({
      mediaType: file.mimetype.startsWith("video") ? MediaType.VIDEO : MediaType.PHOTO,
      mediaUrl: `/uploads/complaints/${file.filename}`,
      mimeType: file.mimetype,
    })),
  ];

  if (!media.length) {
    throw new ApiError("At least one media file is required", 400);
  }

  const existingMaxPosition = (await ComplaintMedia.max("positionNumber", {
    where: { complaintId, status: 1 },
  })) as number | null;
  const startingPosition = Number.isFinite(existingMaxPosition ?? NaN)
    ? existingMaxPosition!
    : 0;

  await sequelize.transaction(async (transaction) => {
    await ComplaintMedia.bulkCreate(
      media.map((item, index) => ({
        complaintId,
        mediaType: item.mediaType,
        mediaUrl: item.mediaUrl,
        thumbnailUrl: item.thumbnailUrl || null,
        mimeType: item.mimeType || null,
        positionNumber: startingPosition + index + 1,
        status: 1,
        createdBy: userId,
        updatedBy: userId,
      })),
      { transaction }
    );
  });

  const updatedComplaint = await Complaint.findByPk(complaintId, {
    include: [
      {
        model: ComplaintMedia,
        as: "media",
        where: { status: 1 },
        required: false,
        attributes: { exclude: excludeFields },
      },
      {
        model: ComplaintType,
        as: "complaintType",
        attributes: ["id", "dispName"],
      },
    ],
  });

  const baseUrl = process.env.PUBLIC_BASE_URL || "https://public.nammarajajinagar.com";
  const complaintJson: any = updatedComplaint ? updatedComplaint.toJSON() : null;

  if (complaintJson?.media?.length) {
    complaintJson.media = complaintJson.media.map((m: any) => {
      const formatUrl = (url: string | null) => {
        if (!url) return null;
        return url.startsWith(baseUrl) ? url : `${baseUrl}${url}`;
      };

      return {
        ...m,
        mediaUrl: formatUrl(m.mediaUrl),
        thumbnailUrl: formatUrl(m.thumbnailUrl),
      };
    });
  }

  return sendCreated(res, complaintJson, "Media added to complaint successfully");
});

export const removeComplaintMedia = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);

  const complaintId = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(complaintId)) {
    throw new ApiError("Invalid complaint id", 400);
  }

  const complaint = await Complaint.findOne({ where: { id: complaintId, status: 1 } });
  if (!complaint) {
    throw new ApiError("Complaint not found", 404);
  }

  const mediaIdsInput = req.body?.mediaIds ?? req.body?.ids ?? req.body?.imageIds;
  if (!Array.isArray(mediaIdsInput) || mediaIdsInput.length === 0) {
    throw new ApiError("mediaIds must be a non-empty array", 400);
  }

  const mediaIds = mediaIdsInput
    .map((v) => Number.parseInt(String(v), 10))
    .filter((v) => Number.isInteger(v) && v > 0);

  if (!mediaIds.length) {
    throw new ApiError("mediaIds must contain valid numeric identifiers", 400);
  }

  // ✅ Validate that all provided media belong to this complaint
  const existingMedia = await ComplaintMedia.findAll({
    where: {
      id: { [Op.in]: mediaIds },
      complaintId,
      status: 1,
    },
  });

  if (existingMedia.length !== mediaIds.length) {
    throw new ApiError("Invalid media for the complaint", 400);
  }

  // ✅ Proceed with deletion inside a transaction
  await sequelize.transaction(async (transaction) => {
    await ComplaintMedia.update(
      { status: 0, updatedBy: userId },
      {
        where: {
          id: { [Op.in]: mediaIds },
          complaintId,
          status: 1,
        },
        transaction,
      }
    );
  });

  const updatedComplaint = await Complaint.findByPk(complaintId, {
    include: [
      {
        model: ComplaintMedia,
        as: "media",
        where: { status: 1 },
        required: false,
      },
      {
        model: ComplaintType,
        as: "complaintType",
        attributes: ["id", "dispName"],
      },
    ],
  });

  if (!updatedComplaint) {
    throw new ApiError("Complaint not found after update", 404);
  }

  // ✅ Format clean response
  const baseUrl = process.env.PUBLIC_BASE_URL || "https://public.nammarajajinagar.com";
  const complaintJson: any = updatedComplaint.toJSON();

  if (complaintJson?.media?.length) {
    complaintJson.media = complaintJson.media.map((m: any) => {
      const formatUrl = (url: string | null) =>
        !url ? null : url.startsWith(baseUrl) ? url : `${baseUrl}${url}`;

      // return only essential fields
      return {
        id: m.id,
        complaintId: m.complaintId,
        mediaType: m.mediaType,
        mediaUrl: formatUrl(m.mediaUrl),
        thumbnailUrl: formatUrl(m.thumbnailUrl),
        mimeType: m.mimeType,
        durationSecond: m.durationSecond,
        positionNumber: m.positionNumber,
        caption: m.caption,
      };
    });
  }

  return sendSuccess(res, complaintJson, "Media removed from complaint successfully");
});