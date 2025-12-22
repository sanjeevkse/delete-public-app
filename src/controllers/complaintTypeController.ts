import type { Request, Response, Express } from "express";
import { Op } from "sequelize";
import asyncHandler from "../utils/asyncHandler";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { requireAuthenticatedUser } from "../middlewares/authMiddleware";
import {
  sendCreated,
  sendSuccess,
  calculatePagination,
  sendSuccessWithPagination,
  parseSortDirection,
  parseRequiredString,
  parsePaginationParams
} from "../utils/apiResponse";
import sequelize from "../config/database";
import ComplaintType from "../models/ComplaintType";
import ComplaintTypeStep from "../models/ComplaintTypeSteps";
import { ApiError } from "../middlewares/errorHandler";

// ✅ Common attributes to exclude
const excludeFields = ["createdBy", "updatedBy", "status", "createdAt", "updatedAt"];

// ✅ CREATE Complaint Type
export const createComplaintType = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id: userId } = requireAuthenticatedUser(req);
    const dispName = parseRequiredString(req.body?.dispName, "dispName");
    const description = req.body?.description || null;
    const complaintDepartmentId = req.body?.complaintDepartmentId || null;
    const steps = Array.isArray(req.body?.steps) ? req.body.steps : [];

    const createdComplaintTypeId = await sequelize.transaction(async (transaction) => {
      const complaintType = await ComplaintType.create(
        {
          dispName,
          description,
          complaintDepartmentId,
          status: 1,
          createdBy: userId,
          updatedBy: userId
        },
        { transaction }
      );

      if (steps.length > 0) {
        await ComplaintTypeStep.bulkCreate(
          steps.map((step: any) => ({
            complaintTypeId: complaintType.id,
            stepOrder: step.stepOrder,
            dispName: step.dispName,
            description: step.description || null,
            status: 1,
            createdBy: userId,
            updatedBy: userId
          })),
          { transaction }
        );
      }

      return complaintType.id;
    });

    const createdComplaintType = await ComplaintType.findByPk(createdComplaintTypeId, {
      attributes: { exclude: excludeFields },
      include: [
        {
          model: ComplaintTypeStep,
          as: "steps",
          where: { status: 1 },
          required: false,
          attributes: { exclude: excludeFields }
        }
      ]
    });

    return sendCreated(res, createdComplaintType, "Complaint Type created successfully");
  }
);

const PAGE_DEFAULT = 1;
const LIMIT_DEFAULT = 10;
const LIMIT_MAX = 100;

export const getAllComplaintTypes = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { page, limit, offset } = parsePaginationParams(
      req.query.page as string | undefined,
      req.query.limit as string | undefined,
      10,
      100
    );
    const sortDirection = parseSortDirection(req.query.sort as string | undefined, "ASC");

    const where: any = {};

    const searchTerm = (req.query.search as string | undefined)?.trim();
    const status = req.query.status ? Number(req.query.status) : 1;

    if (typeof status === "number" && !Number.isNaN(status)) {
      where.status = status;
    }

    if (searchTerm) {
      where[Op.or] = [
        { dispName: { [Op.like]: `%${searchTerm}%` } },
        { description: { [Op.like]: `%${searchTerm}%` } }
      ];
    }

    const { rows, count } = await ComplaintType.findAndCountAll({
      where,
      attributes: { exclude: excludeFields },
      include: [
        {
          model: ComplaintTypeStep,
          as: "steps",
          where: { status: 1 },
          required: false,
          attributes: [
            "id",
            ["disp_name", "name"],
            "description",
            "status",
            ["step_order", "stepOrder"],
            ["complaint_type_id", "complaintTypeId"]
          ],
          order: [["step_order", "ASC"]]
        }
      ],
      order: [["id", sortDirection]],
      limit,
      offset,
      distinct: true
    });

    const data = rows.map((ct: any) => {
      const ctJson = ct.toJSON ? ct.toJSON() : ct;
      return {
        id: ctJson.id,
        dispName: ctJson.dispName,
        description: ctJson.description,
        status: ctJson.status,
        steps: Array.isArray(ctJson.steps)
          ? ctJson.steps.map((s: any) => ({
              id: s.id,
              name: s.name,
              description: s.description,
              // status: s.status,
              stepOrder: s.stepOrder,
              complaintTypeId: s.complaintTypeId
            }))
          : []
      };
    });

    const pagination = calculatePagination(count, page, limit);

    return sendSuccessWithPagination(
      res,
      data,
      pagination,
      data.length ? "Complaint Types fetched successfully" : "No complaint types found"
    );
  }
);

// ✅ GET Complaint Type By ID
export const getComplaintTypeById = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const complaintType = await ComplaintType.findOne({
      where: { id, status: 1 },
      attributes: { exclude: excludeFields },
      include: [
        {
          model: ComplaintTypeStep,
          as: "steps",
          where: { status: 1 },
          required: false,
          attributes: [
            ["id", "id"],
            ["complaint_type_id", "complaintTypeId"],
            ["step_order", "stepOrder"],
            ["disp_name", "dispName"],
            ["description", "description"],
            ["status", "status"]
          ]
        }
      ]
    });

    if (!complaintType) {
      throw new ApiError("Complaint Type not found", 404);
    }

    return sendSuccess(res, complaintType, "Complaint Type fetched successfully");
  }
);

// ✅ UPDATE Complaint Type and Steps
export const updateComplaintType = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id: userId } = requireAuthenticatedUser(req);
    const { id: paramId } = req.params;
    const id = Number(paramId);
    const { dispName, description, complaintDepartmentId, steps = [] } = req.body;

    if (isNaN(id)) {
      throw new ApiError("Invalid complaint type ID", 400);
    }

    const updatedComplaintType = await sequelize.transaction(async (transaction) => {
      const complaintType = await ComplaintType.findByPk(id, { transaction });

      if (!complaintType || complaintType.status === 0) {
        throw new ApiError("Complaint Type not found", 404);
      }

      await complaintType.update(
        {
          dispName,
          description,
          complaintDepartmentId,
          updatedBy: userId
        },
        { transaction }
      );

      // Get all existing steps to reset their stepOrder to negative values
      const existingSteps = await ComplaintTypeStep.findAll({
        where: { complaintTypeId: id },
        transaction
      });

      // Reset all existing steps with negative stepOrder and status: 0
      for (let i = 0; i < existingSteps.length; i++) {
        await ComplaintTypeStep.update(
          {
            stepOrder: -(i + 1),
            status: 0,
            updatedBy: userId
          },
          { where: { id: existingSteps[i].id }, transaction }
        );
      }

      // Now upsert steps with the new data
      for (const step of steps) {
        if (step.id) {
          const [affectedCount] = await ComplaintTypeStep.update(
            {
              stepOrder: step.stepOrder,
              dispName: step.dispName,
              description: step.description || null,
              status: 1,
              updatedBy: userId
            },
            { where: { id: step.id, complaintTypeId: id }, transaction }
          );

          if (affectedCount === 0) {
            throw new ApiError(`Invalid step ID: ${step.id}`, 400);
          }
        } else {
          await ComplaintTypeStep.create(
            {
              complaintTypeId: id,
              stepOrder: step.stepOrder,
              dispName: step.dispName,
              description: step.description || null,
              status: 1,
              createdBy: userId,
              updatedBy: userId
            },
            { transaction }
          );
        }
      }

      return await ComplaintType.findByPk(id, {
        transaction,
        attributes: { exclude: ["createdBy", "updatedBy", "status", "createdAt", "updatedAt"] },
        include: [
          {
            model: ComplaintTypeStep,
            as: "steps",
            where: { status: 1 },
            required: false,
            attributes: { exclude: ["createdBy", "updatedBy", "status", "createdAt", "updatedAt"] }
          }
        ]
      });
    });

    return sendSuccess(res, updatedComplaintType, "Complaint Type updated successfully");
  }
);

// ✅ DELETE Complaint Type (soft delete)
export const deleteComplaintType = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id: paramId } = req.params;
    const id = Number(paramId);

    if (isNaN(id)) {
      throw new ApiError("Invalid complaint type ID", 400);
    }

    const result = await sequelize.transaction(async (transaction) => {
      const complaintType = await ComplaintType.findOne({
        where: { id, status: 1 },
        transaction
      });

      if (!complaintType) {
        throw new ApiError("Complaint Type not found or already deleted", 404);
      }

      await ComplaintType.update({ status: 0 }, { where: { id }, transaction });
      await ComplaintTypeStep.update(
        { status: 0 },
        { where: { complaintTypeId: id }, transaction }
      );

      return complaintType;
    });

    return sendSuccess(res, null, `Complaint Type '${result.dispName}' deleted successfully`);
  }
);
