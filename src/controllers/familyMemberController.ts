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
import { buildQueryAttributes, shouldIncludeAuditFields } from "../utils/queryAttributes";
import { assertNoRestrictedFields } from "../utils/payloadValidation";

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
  const status = req.query.status as string | undefined;
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

  if (status === undefined || status === null || status === "") {
    filters.push({ status: 1 });
  } else {
    const parsedStatus = Number.parseInt(status, 10);
    if (!Number.isNaN(parsedStatus)) {
      filters.push({ status: parsedStatus });
    }
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

  const includeAuditFields = shouldIncludeAuditFields(req.query);
  const attributes = buildQueryAttributes({ includeAuditFields, keepFields: ["createdAt"] });

  const { rows, count } = await FamilyMember.findAndCountAll({
    where,
    attributes,
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

  return sendSuccessWithPagination(res, rows, pagination, "Family members retrieved successfully");
});

/**
 * Get a single family member by ID
 * GET /api/family-members/:id
 */
export const getFamilyMember = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const includeInactive =
    req.query.includeInactive === "true" || req.query.includeInactive === "1";

  const includeAuditFields = shouldIncludeAuditFields(req.query);
  const attributes = buildQueryAttributes({ includeAuditFields, keepFields: ["status"] });

  const familyMember = await FamilyMember.findByPk(id, {
    attributes,
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

  if (!familyMember || (!includeInactive && familyMember.status === 0)) {
    return sendNotFound(res, "Family member not found");
  }

  if (!includeAuditFields) {
    const { status: _status, ...payload } = familyMember.get({ plain: true });
    return sendSuccess(res, payload, "Family member retrieved successfully");
  }

  return sendSuccess(res, familyMember, "Family member retrieved successfully");
});

/**
 * Create a new family member
 * POST /api/family-members
 */
export const createFamilyMember = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  assertNoRestrictedFields(req.body);

  const { userId, fullName, contactNumber, email, fullAddress, aadhaarNumber, relationTypeId } =
    req.body;
  const currentUserId = req.user?.id ?? null;

  const fieldErrors: Array<{ field: string; message: string }> = [];

  let normalizedUserId: number | null = null;
  if (userId === undefined || userId === null || userId === "") {
    fieldErrors.push({ field: "userId", message: "User ID is required" });
  } else if (typeof userId === "number" && Number.isFinite(userId)) {
    normalizedUserId = userId;
  } else if (typeof userId === "string" && userId.trim()) {
    const parsedUserId = Number.parseInt(userId.trim(), 10);
    if (Number.isNaN(parsedUserId)) {
      fieldErrors.push({ field: "userId", message: "User ID must be a numeric value" });
    } else {
      normalizedUserId = parsedUserId;
    }
  } else {
    fieldErrors.push({ field: "userId", message: "User ID must be a numeric value" });
  }

  const normalizedFullName =
    typeof fullName === "string"
      ? fullName.trim()
      : typeof fullName === "number"
        ? String(fullName)
        : "";
  if (!normalizedFullName) {
    fieldErrors.push({ field: "fullName", message: "Full name is required" });
  }

  let normalizedRelationTypeId: number | null = null;
  if (relationTypeId === undefined || relationTypeId === null || relationTypeId === "") {
    fieldErrors.push({ field: "relationTypeId", message: "Relation type ID is required" });
  } else if (typeof relationTypeId === "number" && Number.isFinite(relationTypeId)) {
    normalizedRelationTypeId = relationTypeId;
  } else if (typeof relationTypeId === "string" && relationTypeId.trim()) {
    const parsedRelationTypeId = Number.parseInt(relationTypeId.trim(), 10);
    if (Number.isNaN(parsedRelationTypeId)) {
      fieldErrors.push({
        field: "relationTypeId",
        message: "Relation type ID must be a numeric value"
      });
    } else {
      normalizedRelationTypeId = parsedRelationTypeId;
    }
  } else {
    fieldErrors.push({ field: "relationTypeId", message: "Relation type ID must be numeric" });
  }

  const normalizedContactNumber =
    contactNumber === undefined || contactNumber === null
      ? null
      : typeof contactNumber === "string"
        ? contactNumber.trim() || null
        : typeof contactNumber === "number"
          ? String(contactNumber)
          : (() => {
              fieldErrors.push({
                field: "contactNumber",
                message: "Contact number must be a string or numeric value"
              });
              return null;
            })();

  let normalizedEmail: string | null = null;
  if (email !== undefined && email !== null) {
    if (typeof email === "string") {
      const trimmedEmail = email.trim();
      if (trimmedEmail) {
        normalizedEmail = trimmedEmail;
      }
    } else {
      fieldErrors.push({ field: "email", message: "Email must be a string value" });
    }
  }

  const normalizedFullAddress =
    fullAddress === undefined || fullAddress === null
      ? null
      : typeof fullAddress === "string"
        ? fullAddress.trim() || null
        : (() => {
            fieldErrors.push({
              field: "fullAddress",
              message: "Full address must be a string value"
            });
            return null;
          })();

  const normalizedAadhaarNumber =
    aadhaarNumber === undefined || aadhaarNumber === null
      ? null
      : typeof aadhaarNumber === "string"
        ? aadhaarNumber.trim() || null
        : typeof aadhaarNumber === "number"
          ? String(aadhaarNumber)
          : (() => {
              fieldErrors.push({
                field: "aadhaarNumber",
                message: "Aadhaar number must be a string or numeric value"
              });
              return null;
            })();

  if (fieldErrors.length > 0) {
    throw new ApiError("Validation failed", 422, "VALIDATION_ERROR", fieldErrors);
  }

  // Verify user exists
  const user = normalizedUserId ? await User.findByPk(normalizedUserId) : null;
  if (!user) {
    fieldErrors.push({ field: "userId", message: "User not found" });
  }

  // Verify relation type exists
  const relationType = normalizedRelationTypeId
    ? await MetaRelationType.findByPk(normalizedRelationTypeId)
    : null;
  if (!relationType) {
    fieldErrors.push({ field: "relationTypeId", message: "Relation type not found" });
  }

  if (fieldErrors.length > 0) {
    throw new ApiError("Validation failed", 422, "VALIDATION_ERROR", fieldErrors);
  }

  const familyMember = await FamilyMember.create({
    userId: normalizedUserId!,
    fullName: normalizedFullName,
    contactNumber: normalizedContactNumber,
    email: normalizedEmail,
    fullAddress: normalizedFullAddress,
    aadhaarNumber: normalizedAadhaarNumber,
    relationTypeId: normalizedRelationTypeId!,
    status: 1,
    createdBy: currentUserId,
    updatedBy: currentUserId
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
  assertNoRestrictedFields(req.body);

  const { userId, fullName, contactNumber, email, fullAddress, aadhaarNumber, relationTypeId } =
    req.body;
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
export const deleteFamilyMember = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const currentUserId = req.user?.id;

  const familyMember = await FamilyMember.findByPk(id);

  if (!familyMember) {
    return sendNotFound(res, "Family member not found");
  }

  await FamilyMember.update(
    {
      status: 0,
      ...(currentUserId ? { updatedBy: currentUserId } : {})
    },
    { where: { id: familyMember.id } }
  );

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
