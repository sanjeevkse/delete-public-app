import type { Request, Response } from "express";
import { Op } from "sequelize";

import { ApiError } from "../middlewares/errorHandler";
import Member from "../models/Member";
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
    limit,
    offset,
    order: [["createdAt", "DESC"]]
  });

  const pagination = calculatePagination(count, page, limit);

  sendSuccessWithPagination(res, rows, pagination, "Members retrieved successfully");
});

/**
 * Get a single member by ID
 * GET /api/members/:id
 */
export const getMember = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const member = await Member.findByPk(id);

  if (!member) {
    return sendNotFound(res, "Member not found");
  }

  sendSuccess(res, member, "Member retrieved successfully");
});

/**
 * Create a new member
 * POST /api/members
 */
export const createMember = asyncHandler(async (req: Request, res: Response) => {
  const { fullName, contactNumber, email } = req.body;

  // Validate required fields
  if (!fullName || !contactNumber || !email) {
    throw new ApiError("Missing required fields: fullName, contactNumber, email", 400);
  }

  // Check if email already exists
  const existingMember = await Member.findOne({ where: { email } });
  if (existingMember) {
    throw new ApiError("A member with this email already exists", 409);
  }

  const member = await Member.create({
    fullName,
    contactNumber,
    email
  });

  sendCreated(res, member, "Member created successfully");
});

/**
 * Update a member
 * PUT /api/members/:id
 */
export const updateMember = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
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

  sendSuccess(res, member, "Member updated successfully");
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

  await member.destroy();

  sendNoContent(res);
});
