import { Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import {
  sendCreated,
  sendSuccess,
  sendSuccessWithPagination,
  calculatePagination,
  parsePaginationParams,
  validateSortColumn,
  parseSortDirection
} from "../utils/apiResponse";
import { ApiError } from "../middlewares/errorHandler";
import sequelize from "../config/database";
import Complaint from "../models/Complaint";
import MetaComplaintStatus from "../models/MetaComplaintStatus";
import ComplaintStatusHistory from "../models/ComplaintStatusHistory";
import ComplaintStatusHistoryMedia from "../models/ComplaintStatusHistoryMedia";
import { requireAuthenticatedUser } from "../middlewares/authMiddleware";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { buildPublicUploadPath } from "../middlewares/uploadMiddleware";

const excludeFields = ["createdBy", "updatedBy", "status", "createdAt", "updatedAt"];

// ===== META COMPLAINT STATUS CRUD =====

export const createComplaintStatus = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id: userId } = requireAuthenticatedUser(req);
    const { dispName, description, colorCode, displayOrder } = req.body;

    if (!dispName) {
      throw new ApiError("Display name is required", 400);
    }

    const complaintStatus = await MetaComplaintStatus.create({
      dispName,
      description: description || null,
      colorCode: colorCode || null,
      displayOrder: displayOrder || 0,
      status: 1,
      createdBy: userId,
      updatedBy: userId
    });

    return sendCreated(res, complaintStatus, "Complaint status created successfully");
  }
);

export const getAllComplaintStatuses = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { page, limit, offset } = parsePaginationParams(
      req.query.page as string,
      req.query.limit as string,
      50,
      100
    );
    const sortDirection = parseSortDirection(req.query.sort, "ASC");
    const sortColumn = validateSortColumn(
      req.query.sortColumn,
      ["id", "dispName", "displayOrder", "createdAt"],
      "displayOrder"
    );

    const { rows, count } = await MetaComplaintStatus.findAndCountAll({
      where: { status: 1 },
      attributes: ["id", "dispName", "description", "colorCode", "displayOrder"],
      limit,
      offset,
      order: [[sortColumn, sortDirection]]
    });

    const pagination = calculatePagination(count, page, limit);

    return sendSuccessWithPagination(
      res,
      rows,
      pagination,
      rows.length ? "Complaint statuses fetched successfully" : "No complaint statuses found"
    );
  }
);

export const getComplaintStatusById = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const complaintStatus = await MetaComplaintStatus.findOne({
      where: { id, status: 1 },
      attributes: ["id", "dispName", "description", "colorCode", "displayOrder"]
    });

    if (!complaintStatus) {
      throw new ApiError("Complaint status not found", 404);
    }

    return sendSuccess(res, complaintStatus, "Complaint status fetched successfully");
  }
);

export const updateComplaintStatus = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id: userId } = requireAuthenticatedUser(req);
    const { id } = req.params;
    const { dispName, description, colorCode, displayOrder } = req.body;

    const complaintStatus = await MetaComplaintStatus.findOne({ where: { id, status: 1 } });

    if (!complaintStatus) {
      throw new ApiError("Complaint status not found", 404);
    }

    await complaintStatus.update({
      dispName: dispName || complaintStatus.dispName,
      description: description !== undefined ? description : complaintStatus.description,
      colorCode: colorCode !== undefined ? colorCode : complaintStatus.colorCode,
      displayOrder: displayOrder !== undefined ? displayOrder : complaintStatus.displayOrder,
      updatedBy: userId
    });

    return sendSuccess(res, complaintStatus, "Complaint status updated successfully");
  }
);

export const deleteComplaintStatus = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id: userId } = requireAuthenticatedUser(req);
    const { id } = req.params;

    const complaintStatus = await MetaComplaintStatus.findOne({ where: { id, status: 1 } });

    if (!complaintStatus) {
      throw new ApiError("Complaint status not found", 404);
    }

    await complaintStatus.update({
      status: 0,
      updatedBy: userId
    });

    return sendSuccess(res, null, "Complaint status deleted successfully");
  }
);

// ===== CHANGE COMPLAINT STATUS =====

export const changeComplaintStatus = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id: userId } = requireAuthenticatedUser(req);
    const { complaintId } = req.params;
    const { complaintStatusId, remarks } = req.body;

    if (!complaintStatusId) {
      throw new ApiError("Complaint status ID is required", 400);
    }

    // Verify complaint exists
    const complaint = await Complaint.findOne({ where: { id: complaintId, status: 1 } });
    if (!complaint) {
      throw new ApiError("Complaint not found", 404);
    }

    // Verify status exists
    const status = await MetaComplaintStatus.findOne({
      where: { id: complaintStatusId, status: 1 }
    });
    if (!status) {
      throw new ApiError("Invalid complaint status", 400);
    }

    const mediaFiles = req.files as Express.Multer.File[] | undefined;

    await sequelize.transaction(async (transaction) => {
      // Create status history entry
      const statusHistory = await ComplaintStatusHistory.create(
        {
          complaintId: Number(complaintId),
          complaintStatusId,
          remarks: remarks || null,
          changedBy: userId,
          changedAt: new Date(),
          status: 1,
          createdBy: userId,
          updatedBy: userId
        },
        { transaction }
      );

      // Add media if any
      if (mediaFiles?.length) {
        const mediaData = mediaFiles.map((file, idx) => {
          let mediaType: "PHOTO" | "VIDEO" | "DOCUMENT" = "DOCUMENT";
          if (file.mimetype.startsWith("video")) {
            mediaType = "VIDEO";
          } else if (file.mimetype.startsWith("image")) {
            mediaType = "PHOTO";
          }

          return {
            complaintStatusHistoryId: statusHistory.id,
            mediaType,
            mediaUrl: buildPublicUploadPath(file.path),
            thumbnailUrl: null,
            mimeType: file.mimetype,
            fileSize: file.size,
            positionNumber: idx + 1,
            caption: null,
            status: 1,
            createdBy: userId,
            updatedBy: userId
          };
        });
        await ComplaintStatusHistoryMedia.bulkCreate(mediaData, { transaction });
      }

      // Update complaint's current status
      await complaint.update(
        {
          currentStatusId: complaintStatusId,
          updatedBy: userId
        },
        { transaction }
      );
    });

    // Fetch updated complaint with status
    const updatedComplaint = await Complaint.findByPk(complaintId, {
      attributes: { exclude: excludeFields },
      include: [
        {
          model: MetaComplaintStatus,
          as: "currentStatus",
          attributes: ["id", "dispName", "colorCode"]
        }
      ]
    });

    return sendSuccess(res, updatedComplaint, "Complaint status changed successfully");
  }
);

// ===== GET STATUS HISTORY FOR A COMPLAINT =====

export const getComplaintStatusHistory = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { complaintId } = req.params;

    const complaint = await Complaint.findOne({ where: { id: complaintId, status: 1 } });
    if (!complaint) {
      throw new ApiError("Complaint not found", 404);
    }

    const history = await ComplaintStatusHistory.findAll({
      where: { complaintId, status: 1 },
      attributes: { exclude: excludeFields },
      include: [
        {
          model: MetaComplaintStatus,
          as: "complaintStatus",
          attributes: ["id", "dispName", "colorCode"]
        },
        {
          model: ComplaintStatusHistoryMedia,
          as: "media",
          where: { status: 1 },
          required: false,
          attributes: { exclude: excludeFields }
        }
      ],
      order: [["changedAt", "DESC"]]
    });

    const baseUrl = process.env.PUBLIC_BASE_URL || "https://public.nammarajajinagar.com";

    const formattedHistory = history.map((h: any) => {
      const historyJson = h.toJSON();

      if (historyJson.media?.length) {
        historyJson.media = historyJson.media.map((m: any) => ({
          ...m,
          mediaUrl: m.mediaUrl?.startsWith("http") ? m.mediaUrl : `${baseUrl}${m.mediaUrl}`,
          thumbnailUrl: m.thumbnailUrl?.startsWith("http")
            ? m.thumbnailUrl
            : m.thumbnailUrl
              ? `${baseUrl}${m.thumbnailUrl}`
              : null
        }));
      }

      return historyJson;
    });

    return sendSuccess(res, formattedHistory, "Complaint status history fetched successfully");
  }
);
