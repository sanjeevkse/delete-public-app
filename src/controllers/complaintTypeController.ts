import { Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { requireAuthenticatedUser } from "../middlewares/authMiddleware";
import { sendCreated, sendSuccess } from "../utils/apiResponse";
import sequelize from "../config/database";
import ComplaintType from "../models/ComplaintType";
import ComplaintTypeStep from "../models/ComplaintTypeSteps";
import { ApiError } from "../middlewares/errorHandler";

// ✅ Utility to ensure valid string
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

// ✅ CREATE Complaint Type
export const createComplaintType = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);
  const dispName = parseRequiredString(req.body?.dispName, "dispName");
  const description = req.body?.description || null;
  const steps = Array.isArray(req.body?.steps) ? req.body.steps : [];

  const createdComplaintTypeId = await sequelize.transaction(async (transaction) => {
    const complaintType = await ComplaintType.create(
      { dispName, description, status: 1, createdBy: userId, updatedBy: userId },
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
    include: [{ model: ComplaintTypeStep, as: "steps", where: { status: 1 }, required: false }]
  });

  return sendCreated(res, createdComplaintType, "Complaint Type created successfully");
});


// ✅ GET All Complaint Types
export const getAllComplaintTypes = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const complaintTypes = await ComplaintType.findAll({
    where: { status: 1 },
    include: [{ model: ComplaintTypeStep, as: "steps", where: { status: 1 }, required: false }],
    order: [["id", "ASC"]]
  });

  return sendSuccess(res, complaintTypes, "Complaint Types fetched successfully");
});


// ✅ GET Complaint Type By ID
export const getComplaintTypeById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const complaintType = await ComplaintType.findOne({
    where: { id, status: 1 },
    include: [{ model: ComplaintTypeStep, as: "steps", where: { status: 1 }, required: false }]
  });

  if (!complaintType) {
    throw new ApiError("Complaint Type not found", 404);
  }

  return sendSuccess(res, complaintType, "Complaint Type fetched successfully");
});


// ✅ UPDATE Complaint Type and Steps
export const updateComplaintType = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);
  const { id: paramId } = req.params;
  const id = Number(paramId); // ✅ convert to number
  const { dispName, description, steps = [] } = req.body;

  if (isNaN(id)) {
    throw new ApiError("Invalid complaint type ID", 400);
  }

  const complaintType = await ComplaintType.findByPk(id);
  if (!complaintType) throw new ApiError("Complaint Type not found", 404);

  await sequelize.transaction(async (transaction) => {
    await complaintType.update(
      { dispName, description, updatedBy: userId },
      { transaction }
    );

    // 1️⃣ make all existing steps inactive
    await ComplaintTypeStep.update(
      { status: 0 },
      { where: { complaintTypeId: id }, transaction }
    );

    // 2️⃣ loop through new steps
    for (const step of steps) {
      if (step.id) {
        // 3️⃣ update existing
        await ComplaintTypeStep.update(
          {
            stepOrder: step.stepOrder,
            dispName: step.dispName,
            description: step.description || null,
            status: 1,
            updatedBy: userId
          },
          { where: { id: step.id }, transaction }
        );
      } else {
        // 4️⃣ insert new
        await ComplaintTypeStep.create(
          {
            complaintTypeId: id, // ✅ number type now
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
  });

  const updatedComplaintType = await ComplaintType.findByPk(id, {
    include: [
      { model: ComplaintTypeStep, as: "steps", where: { status: 1 }, required: false }
    ]
  });

  return sendSuccess(res, updatedComplaintType, "Complaint Type updated successfully");
});



// ✅ DELETE Complaint Type (soft delete)
export const deleteComplaintType = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const complaintType = await ComplaintType.findByPk(id);
  if (!complaintType) throw new ApiError("Complaint Type not found", 404);

  await sequelize.transaction(async (transaction) => {
    await ComplaintType.update({ status: 0 }, { where: { id }, transaction });
    await ComplaintTypeStep.update({ status: 0 }, { where: { complaintTypeId: id }, transaction });
  });

  return sendSuccess(res, null, "Complaint Type deleted successfully");
});
