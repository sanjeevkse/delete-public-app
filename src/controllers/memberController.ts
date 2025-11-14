import type { Request, Response } from "express";
import { Op } from "sequelize";

import { ApiError } from "../middlewares/errorHandler";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { requireAuthenticatedUser } from "../middlewares/authMiddleware";
import Member from "../models/Member";
import asyncHandler from "../utils/asyncHandler";
import { assertNoRestrictedFields } from "../utils/payloadValidation";
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

/**
 * List all members with pagination and search
 * GET /api/members
 */
export const listMembers = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = parsePaginationParams(
    req.query.page as string,
    req.query.limit as string,
    25,
    100
  );
  const search = (req.query.search as string) ?? "";

  const includeAuditFields = shouldIncludeAuditFields(req.query);
  const attributes = buildQueryAttributes({ includeAuditFields, keepFields: ["createdAt"] });

  const { rows, count } = await Member.findAndCountAll({
    where: search
      ? {
          [Op.or]: [
            { fullName: { [Op.like]: `%${search}%` } },
            { contactNumber: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } }
          ]
        }
      : undefined,
    attributes,
    limit,
    offset,
    order: [["createdAt", "DESC"]]
  });

  const pagination = calculatePagination(count, page, limit);

  return sendSuccessWithPagination(res, rows, pagination, "Members retrieved successfully");
});

/**
 * Get a single member by ID
 * GET /api/members/:id
 */
export const getMember = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const includeAuditFields = shouldIncludeAuditFields(req.query);
  const attributes = buildQueryAttributes({ includeAuditFields });

  const member = await Member.findByPk(id, { attributes });

  if (!member) {
    return sendNotFound(res, "Member not found");
  }

  return sendSuccess(res, member, "Member retrieved successfully");
});

/**
 * Create a new member
 * POST /api/members
 */
export const createMember = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  assertNoRestrictedFields(req.body);

  const { fullName, contactNumber, email } = req.body;

  const fieldErrors: Array<{ field: string; message: string }> = [];

  const normalizedFullName =
    typeof fullName === "string"
      ? fullName.trim()
      : typeof fullName === "number"
        ? String(fullName)
        : "";
  if (!normalizedFullName) {
    fieldErrors.push({ field: "fullName", message: "Full name is required" });
  }

  const normalizedContactNumber =
    typeof contactNumber === "string"
      ? contactNumber.trim()
      : typeof contactNumber === "number"
        ? String(contactNumber)
        : "";
  if (!normalizedContactNumber) {
    fieldErrors.push({ field: "contactNumber", message: "Contact number is required" });
  }

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

  if (fieldErrors.length > 0) {
    throw new ApiError("Validation failed", 422, "VALIDATION_ERROR", fieldErrors);
  }

  // Check if email already exists
  if (normalizedEmail) {
    const existingMember = await Member.findOne({ where: { email: normalizedEmail } });
    if (existingMember) {
      throw new ApiError("A member with this email already exists", 409);
    }
  }

  const { id: userId } = requireAuthenticatedUser(req);

  const member = await Member.create({
    userId,
    fullName: normalizedFullName,
    contactNumber: normalizedContactNumber,
    email: normalizedEmail
  });

  return sendCreated(res, member, "Member created successfully");
});

/**
 * Update a member
 * PUT /api/members/:id
 */
export const updateMember = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  assertNoRestrictedFields(req.body);

  const { fullName, contactNumber, email } = req.body;

  const member = await Member.findByPk(id);

  if (!member) {
    return sendNotFound(res, "Member not found");
  }

  // Check if email is being changed and if it already exists
  if (email && email !== member.email) {
    const existingMember = await Member.findOne({
      where: {
        email,
        id: { [Op.ne]: id }
      }
    });
    if (existingMember) {
      throw new ApiError("A member with this email already exists", 409);
    }
  }

  // Update only provided fields
  if (fullName !== undefined) member.fullName = fullName;
  if (contactNumber !== undefined) member.contactNumber = contactNumber;
  if (email !== undefined) member.email = email;

  await member.save();

  return sendSuccess(res, member, "Member updated successfully");
});

/**
 * Delete a member
 * DELETE /api/members/:id
 */
export const deleteMember = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const member = await Member.findByPk(id);

  if (!member) {
    return sendNotFound(res, "Member not found");
  }

  // Soft delete: set status to 0
  await member.update({ status: 0 });

  sendNoContent(res);
});

/**
 * Check if the logged-in user is a member
 * GET /api/members/me/check
 */
export const checkMemberStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);

  const member = await Member.findOne({
    where: { userId }
  });

  if (!member) {
    return sendSuccess(
      res,
      {
        isMember: false,
        member: null
      },
      "User is not a member"
    );
  }

  return sendSuccess(
    res,
    {
      isMember: true,
      member: {
        id: member.id,
        fullName: member.fullName,
        contactNumber: member.contactNumber,
        email: member.email,
        createdAt: member.createdAt
      }
    },
    "User is a member"
  );
});
