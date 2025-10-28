import type { Request, Response } from "express";
import { Op } from "sequelize";
import type { Attributes, WhereOptions } from "sequelize";

import { ApiError } from "../middlewares/errorHandler";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import FamilyMember from "../models/FamilyMember";
import MetaRelationType from "../models/MetaRelationType";
import User from "../models/User";
import asyncHandler from "../utils/asyncHandler";
import {
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendNotFound,
  sendSuccessWithPagination,
  parsePaginationParams,
  calculatePagination
} from "../utils/apiResponse";

/**
 * List all family members with pagination and search
 * GET /api/family-members
 */
export const listFamilyMembers = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = parsePaginationParams(
    req.query.page as string,
    req.query.limit as string,
    25,
    100
  );
  const search = (req.query.search as string) ?? "";
  const status = req.query.status as string;
  const userId = req.query.userId as string;
  const relationTypeId = req.query.relationTypeId as string;

  const filters: WhereOptions<Attributes<FamilyMember>>[] = [];

  if (search) {
    filters.push({
      [Op.or]: [
        { fullName: { [Op.like]: `%${search}%` } },
        { contactNumber: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { aadhaarNumber: { [Op.like]: `%${search}%` } }
      ]
    });
  }

  if (status !== undefined) {
    filters.push({ status: Number.parseInt(status, 10) });
  }

  if (userId) {
    filters.push({ userId: Number.parseInt(userId, 10) });
  }

  if (relationTypeId) {
    filters.push({ relationTypeId: Number.parseInt(relationTypeId, 10) });
  }

  const where: WhereOptions<Attributes<FamilyMember>> | undefined = filters.length
    ? { [Op.and]: filters }
    : undefined;

  const { rows, count } = await FamilyMember.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "fullName", "contactNumber", "email"]
      },
      {
        model: MetaRelationType,
        as: "relationType",
        attributes: ["id", "dispName", "description"]
      }
    ],
    limit,
    offset,
    order: [["createdAt", "DESC"]]
  });

  const pagination = calculatePagination(count, page, limit);

  sendSuccessWithPagination(res, rows, pagination, "Family members retrieved successfully");
});

/**
 * Get a single family member by ID
 * GET /api/family-members/:id
 */
export const getFamilyMember = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const familyMember = await FamilyMember.findByPk(id, {
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "fullName", "contactNumber", "email"]
      },
      {
        model: MetaRelationType,
        as: "relationType",
        attributes: ["id", "dispName", "description"]
      }
    ]
  });

  if (!familyMember) {
    return sendNotFound(res, "Family member not found");
  }

  sendSuccess(res, familyMember, "Family member retrieved successfully");
});

/**
 * Create a new family member
 * POST /api/family-members
 */
export const createFamilyMember = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const {
    userId,
    fullName,
    contactNumber,
    email,
    fullAddress,
    aadhaarNumber,
    relationTypeId,
    status
  } = req.body;
  const currentUserId = req.user?.id;

  // Validate required fields
  if (!userId || !fullName || !relationTypeId) {
    throw new ApiError("Missing required fields: userId, fullName, relationTypeId", 400);
  }

  // Verify user exists
  const user = await User.findByPk(userId);
  if (!user) {
    throw new ApiError("Invalid user ID", 400);
  }

  // Verify relation type exists
  const relationType = await MetaRelationType.findByPk(relationTypeId);
  if (!relationType) {
    throw new ApiError("Invalid relation type ID", 400);
  }

  const familyMember = await FamilyMember.create({
    userId,
    fullName,
    contactNumber: contactNumber || null,
    email: email || null,
    fullAddress: fullAddress || null,
    aadhaarNumber: aadhaarNumber || null,
    relationTypeId,
    status: status !== undefined ? status : 1,
    createdBy: currentUserId || null,
    updatedBy: currentUserId || null
  });

  // Fetch the created family member with relations
  const createdFamilyMember = await FamilyMember.findByPk(familyMember.id, {
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "fullName", "contactNumber", "email"]
      },
      {
        model: MetaRelationType,
        as: "relationType",
        attributes: ["id", "dispName", "description"]
      }
    ]
  });

  sendCreated(res, createdFamilyMember, "Family member created successfully");
});

/**
 * Update a family member
 * PUT /api/family-members/:id
 */
export const updateFamilyMember = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const {
    userId,
    fullName,
    contactNumber,
    email,
    fullAddress,
    aadhaarNumber,
    relationTypeId,
    status
  } = req.body;
  const currentUserId = req.user?.id;

  const familyMember = await FamilyMember.findByPk(id);

  if (!familyMember) {
    return sendNotFound(res, "Family member not found");
  }

  // Verify user exists if being changed
  if (userId && userId !== familyMember.userId) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new ApiError("Invalid user ID", 400);
    }
  }

  // Verify relation type exists if being changed
  if (relationTypeId && relationTypeId !== familyMember.relationTypeId) {
    const relationType = await MetaRelationType.findByPk(relationTypeId);
    if (!relationType) {
      throw new ApiError("Invalid relation type ID", 400);
    }
  }

  // Update only provided fields
  if (userId !== undefined) familyMember.userId = userId;
  if (fullName !== undefined) familyMember.fullName = fullName;
  if (contactNumber !== undefined) familyMember.contactNumber = contactNumber;
  if (email !== undefined) familyMember.email = email;
  if (fullAddress !== undefined) familyMember.fullAddress = fullAddress;
  if (aadhaarNumber !== undefined) familyMember.aadhaarNumber = aadhaarNumber;
  if (relationTypeId !== undefined) familyMember.relationTypeId = relationTypeId;
  if (status !== undefined) familyMember.status = status;
  if (currentUserId) familyMember.updatedBy = currentUserId;

  await familyMember.save();

  // Fetch updated family member with relations
  const updatedFamilyMember = await FamilyMember.findByPk(id, {
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "fullName", "contactNumber", "email"]
      },
      {
        model: MetaRelationType,
        as: "relationType",
        attributes: ["id", "dispName", "description"]
      }
    ]
  });

  sendSuccess(res, updatedFamilyMember, "Family member updated successfully");
});

/**
 * Delete a family member
 * DELETE /api/family-members/:id
 */
export const deleteFamilyMember = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const familyMember = await FamilyMember.findByPk(id);

  if (!familyMember) {
    return sendNotFound(res, "Family member not found");
  }

  await familyMember.destroy();

  sendNoContent(res);
});

/**
 * Toggle family member status (activate/deactivate)
 * PATCH /api/family-members/:id/status
 */
export const toggleFamilyMemberStatus = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user?.id;

    const familyMember = await FamilyMember.findByPk(id);

    if (!familyMember) {
      return sendNotFound(res, "Family member not found");
    }

    if (status === undefined) {
      throw new ApiError("Status field is required", 400);
    }

    familyMember.status = status;
    if (userId) familyMember.updatedBy = userId;
    await familyMember.save();

    const updatedFamilyMember = await FamilyMember.findByPk(id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "fullName", "contactNumber", "email"]
        },
        {
          model: MetaRelationType,
          as: "relationType",
          attributes: ["id", "dispName", "description"]
        }
      ]
    });

    sendSuccess(res, updatedFamilyMember, "Family member status updated successfully");
  }
);
