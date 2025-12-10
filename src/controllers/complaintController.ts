import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import {
  sendCreated,
  sendSuccess,
  calculatePagination,
  sendSuccessWithPagination,
  parseSortDirection,
  parsePaginationParams
} from "../utils/apiResponse";
import { ApiError } from "../middlewares/errorHandler";
import sequelize from "../config/database";
import Complaint from "../models/Complaint";
import ComplaintMedia from "../models/ComplaintMedia";
import ComplaintType from "../models/ComplaintType";
import MetaSectorDepartment from "../models/MetaSectorDepartment";
import MetaWardNumber from "../models/MetaWardNumber";
import MetaBoothNumber from "../models/MetaBoothNumber";
import MetaComplaintStatus from "../models/MetaComplaintStatus";
import { requireAuthenticatedUser } from "../middlewares/authMiddleware";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { MediaType } from "../types/enums";
import { Sequelize, Op } from "sequelize";
import { buildPublicUploadPath } from "../middlewares/uploadMiddleware";

// ✅ Common attributes to exclude
const excludeFields = ["updatedBy", "status", "updatedAt"];

export const createComplaint = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);
  const {
    selfOther,
    sectorDepartmentId,
    complaintTypeId,
    wardNumberId,
    boothNumberId,
    title,
    description,
    locationText,
    latitude,
    longitude,
    landmark,
    fullName,
    contactNumber,
    alternateContactNumber,
    email,
    fullAddress
  } = req.body;

  // Validate required fields
  if (!fullName || !contactNumber) {
    throw new ApiError("Full name and contact number are required", 400);
  }

  const mediaFiles = req.files as Express.Multer.File[] | undefined;
  const complaintType = await ComplaintType.findOne({ where: { id: complaintTypeId, status: 1 } });
  if (!complaintType) throw new ApiError("Invalid complaint type", 400);

  const complaint = await sequelize.transaction(async (transaction) => {
    const newComplaint = await Complaint.create(
      {
        selfOther,
        sectorDepartmentId: sectorDepartmentId || null,
        complaintTypeId,
        wardNumberId: wardNumberId || null,
        boothNumberId: boothNumberId || null,
        currentStatusId: 1, // Default status is "Pending"
        title,
        description,
        locationText,
        latitude,
        longitude,
        landmark,
        fullName,
        contactNumber,
        alternateContactNumber: alternateContactNumber || null,
        email: email || null,
        fullAddress: fullAddress || null,
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
    attributes: { exclude: ["updatedBy", "status", "updatedAt"] },
    include: [
      {
        model: ComplaintMedia,
        as: "media",
        where: { status: 1 },
        required: false,
        attributes: { exclude: ["createdBy", "updatedBy", "status", "createdAt", "updatedAt"] }
      },
      { model: ComplaintType, as: "complaintType", attributes: ["id", "dispName", "description"] },
      {
        model: MetaSectorDepartment,
        as: "sectorDepartment",
        attributes: ["id", "dispName"],
        required: false
      },
      { model: MetaWardNumber, as: "wardNumber", attributes: ["id", "dispName"], required: false },
      {
        model: MetaBoothNumber,
        as: "boothNumber",
        attributes: ["id", "dispName"],
        required: false
      },
      {
        model: MetaComplaintStatus,
        as: "currentStatus",
        attributes: ["id", "dispName", "description", "colorCode"],
        required: true
      }
    ]
  });

  return sendCreated(res, result, "Complaint created successfully");
});

export const getComplaintById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const complaint = await Complaint.findByPk(id, {
    attributes: { exclude: ["updatedBy", "status", "updatedAt"] },
    include: [
      {
        model: ComplaintMedia,
        as: "media",
        where: { status: 1 },
        required: false,
        attributes: { exclude: ["createdBy", "updatedBy", "status", "createdAt", "updatedAt"] }
      },
      {
        model: ComplaintType,
        as: "complaintType",
        attributes: ["id", "dispName", "description"]
      },
      {
        model: MetaSectorDepartment,
        as: "sectorDepartment",
        attributes: ["id", "dispName"],
        required: false
      },
      { model: MetaWardNumber, as: "wardNumber", attributes: ["id", "dispName"], required: false },
      {
        model: MetaBoothNumber,
        as: "boothNumber",
        attributes: ["id", "dispName"],
        required: false
      },
      {
        model: MetaComplaintStatus,
        as: "currentStatus",
        attributes: ["id", "dispName", "description", "colorCode"],
        required: true
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

export const listComplaints = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { page, limit, offset } = parsePaginationParams(
    req.query.page as string | undefined,
    req.query.limit as string | undefined,
    10,
    100
  );
  const sortDirection = parseSortDirection(req.query.sort, "DESC");

  const where: any = { status: 1 };

  const searchTerm = (req.query.search as string | undefined)?.trim();
  const complaintTypeId = req.query.complaintTypeId ? Number(req.query.complaintTypeId) : undefined;
  const currentStatusId = req.query.currentStatusId ? Number(req.query.currentStatusId) : undefined;
  const selfOther = (req.query.selfOther as string | undefined)?.trim();

  if (complaintTypeId && !Number.isNaN(complaintTypeId)) {
    where.complaintTypeId = complaintTypeId;
  }

  if (currentStatusId && !Number.isNaN(currentStatusId)) {
    where.currentStatusId = currentStatusId;
  }

  if (selfOther) {
    where.selfOther = selfOther;
  }

  if (searchTerm) {
    where[Op.or] = [
      { title: { [Op.like]: `%${searchTerm}%` } },
      { description: { [Op.like]: `%${searchTerm}%` } }
    ];
  }

  const { rows, count } = await Complaint.findAndCountAll({
    where,
    attributes: { exclude: ["updatedBy", "status", "updatedAt"] },
    include: [
      {
        model: ComplaintMedia,
        as: "media",
        where: { status: 1 },
        required: false,
        attributes: {
          exclude: ["createdBy", "updatedBy", "status", "createdAt", "updatedAt"]
        }
      },
      {
        model: ComplaintType,
        as: "complaintType",
        attributes: ["id", "dispName", "description"],
        required: false
      },
      {
        model: MetaSectorDepartment,
        as: "sectorDepartment",
        attributes: ["id", "dispName"],
        required: false
      },
      { model: MetaWardNumber, as: "wardNumber", attributes: ["id", "dispName"], required: false },
      {
        model: MetaBoothNumber,
        as: "boothNumber",
        attributes: ["id", "dispName"],
        required: false
      },
      {
        model: MetaComplaintStatus,
        as: "currentStatus",
        attributes: ["id", "dispName", "description", "colorCode"],
        required: true
      }
    ],
    order: [["id", sortDirection]],
    limit,
    offset,
    distinct: true
  });

  const complaintsJSON = rows.map((c: any) => c.toJSON());
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
        thumbnailUrl: makeFullUrl(m.thumbnailUrl)
      };
    });

    return {
      id: c.id,
      selfOther: c.selfOther,
      sectorDepartmentId: c.sectorDepartmentId,
      sectorDepartment: c.sectorDepartment || null,
      complaintTypeId: c.complaintTypeId,
      complaintType: c.complaintType || null,
      wardNumberId: c.wardNumberId,
      wardNumber: c.wardNumber || null,
      boothNumberId: c.boothNumberId,
      boothNumber: c.boothNumber || null,
      currentStatusId: c.currentStatusId,
      currentStatus: c.currentStatus, // Now always present, no need for || null
      title: c.title,
      description: c.description,
      locationText: c.locationText,
      latitude: c.latitude,
      longitude: c.longitude,
      landmark: c.landmark,
      fullName: c.fullName,
      contactNumber: c.contactNumber,
      alternateContactNumber: c.alternateContactNumber,
      email: c.email,
      fullAddress: c.fullAddress,
      media: formattedMedia,
      createdAt: c.createdAt
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
    "sectorDepartmentId",
    "complaintTypeId",
    "wardNumberId",
    "boothNumberId",
    "fullName",
    "contactNumber",
    "alternateContactNumber",
    "email",
    "fullAddress"
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
    attributes: { exclude: ["updatedBy", "status", "updatedAt"] },
    include: [
      {
        model: ComplaintMedia,
        as: "media",
        where: { status: 1 },
        required: false,
        attributes: { exclude: ["createdBy", "updatedBy", "status", "createdAt", "updatedAt"] }
      },
      {
        model: ComplaintType,
        as: "complaintType",
        attributes: ["id", "dispName"]
      },
      {
        model: MetaSectorDepartment,
        as: "sectorDepartment",
        attributes: ["id", "dispName"],
        required: false
      },
      { model: MetaWardNumber, as: "wardNumber", attributes: ["id", "dispName"], required: false },
      {
        model: MetaBoothNumber,
        as: "boothNumber",
        attributes: ["id", "dispName"],
        required: false
      },
      {
        model: MetaComplaintStatus,
        as: "currentStatus",
        attributes: ["id", "dispName", "description", "colorCode"],
        required: true
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

  const uploadedFiles = Array.isArray(req.files) ? (req.files as Express.Multer.File[]) : [];

  const media = [
    ...(req.body?.media ?? []),
    ...uploadedFiles.map((file) => ({
      mediaType: file.mimetype.startsWith("video") ? MediaType.VIDEO : MediaType.PHOTO,
      mediaUrl: `/uploads/complaints/${file.filename}`,
      mimeType: file.mimetype
    }))
  ];

  if (!media.length) {
    throw new ApiError("At least one media file is required", 400);
  }

  const existingMaxPosition = (await ComplaintMedia.max("positionNumber", {
    where: { complaintId, status: 1 }
  })) as number | null;
  const startingPosition = Number.isFinite(existingMaxPosition ?? NaN) ? existingMaxPosition! : 0;

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
        updatedBy: userId
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
        attributes: { exclude: ["createdBy", "updatedBy", "status", "createdAt", "updatedAt"] }
      },
      {
        model: ComplaintType,
        as: "complaintType",
        attributes: ["id", "dispName"]
      },
      {
        model: MetaComplaintStatus,
        as: "currentStatus",
        attributes: ["id", "dispName", "description", "colorCode"],
        required: true
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

  return sendCreated(res, complaintJson, "Media added to complaint successfully");
});

export const removeComplaintMedia = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
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
        status: 1
      }
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
            status: 1
          },
          transaction
        }
      );
    });

    const updatedComplaint = await Complaint.findByPk(complaintId, {
      include: [
        {
          model: ComplaintMedia,
          as: "media",
          where: { status: 1 },
          required: false
        },
        {
          model: ComplaintType,
          as: "complaintType",
          attributes: ["id", "dispName"]
        },
        {
          model: MetaComplaintStatus,
          as: "currentStatus",
          attributes: ["id", "dispName", "description", "colorCode"],
          required: true
        }
      ]
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
          caption: m.caption
        };
      });
    }

    return sendSuccess(res, complaintJson, "Media removed from complaint successfully");
  }
);
