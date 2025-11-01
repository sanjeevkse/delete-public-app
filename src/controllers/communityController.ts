import type { Request, Response } from "express";
import { Op } from "sequelize";
import type { Attributes, WhereOptions } from "sequelize";

import { ApiError } from "../middlewares/errorHandler";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import Community from "../models/Community";
import MetaCommunityType from "../models/MetaCommunityType";
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

/**
 * List all communities with pagination and search
 * GET /api/communities
 */
export const listCommunities = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = parsePaginationParams(
    req.query.page as string,
    req.query.limit as string,
    25,
    100
  );
  const search = (req.query.search as string) ?? "";
  const status = req.query.status as string;
  const communityTypeId = req.query.communityTypeId as string;
  const isRegistered = req.query.isRegistered as string;

  const filters: WhereOptions<Attributes<Community>>[] = [];

  if (search) {
    filters.push({
      [Op.or]: [
        { communityName: { [Op.like]: `%${search}%` } },
        { contactPerson: { [Op.like]: `%${search}%` } },
        { contactNumber: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { fullAddress: { [Op.like]: `%${search}%` } }
      ]
    });
  }

  if (status !== undefined) {
    filters.push({ status: Number.parseInt(status, 10) });
  }

  if (communityTypeId) {
    filters.push({ communityTypeId: Number.parseInt(communityTypeId, 10) });
  }

  if (isRegistered !== undefined) {
    filters.push({ isRegistered: Number.parseInt(isRegistered, 10) });
  }

  const where: WhereOptions<Attributes<Community>> | undefined = filters.length
    ? { [Op.and]: filters }
    : undefined;

  const includeAuditFields = shouldIncludeAuditFields(req.query);
  const attributes = buildQueryAttributes({ includeAuditFields, keepFields: ["createdAt"] });

  const { rows, count } = await Community.findAndCountAll({
    where,
    attributes,
    include: [
      {
        model: MetaCommunityType,
        as: "communityType",
        attributes: ["id", "dispName"]
      }
    ],
    limit,
    offset,
    order: [["createdAt", "DESC"]]
  });

  const pagination = calculatePagination(count, page, limit);

  return sendSuccessWithPagination(res, rows, pagination, "Communities retrieved successfully");
});

/**
 * Get a single community by ID
 * GET /api/communities/:id
 */
export const getCommunity = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const includeAuditFields = shouldIncludeAuditFields(req.query);
  const attributes = buildQueryAttributes({ includeAuditFields });

  const community = await Community.findByPk(id, {
    attributes,
    include: [
      {
        model: MetaCommunityType,
        as: "communityType",
        attributes: ["id", "dispName"]
      }
    ]
  });

  if (!community) {
    return sendNotFound(res, "Community not found");
  }

  sendSuccess(res, community, "Community retrieved successfully");
});

/**
 * Create a new community
 * POST /api/communities
 */
export const createCommunity = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const {
    communityTypeId,
    communityName,
    isRegistered,
    registrationDate,
    contactPerson,
    contactNumber,
    email,
    totalMember,
    fullAddress,
    status
  } = req.body;
  const userId = req.user?.id;

  // Validate required fields
  if (!communityTypeId || !communityName) {
    throw new ApiError("Missing required fields: communityTypeId, communityName", 400);
  }

  // Verify community type exists
  const communityType = await MetaCommunityType.findByPk(communityTypeId);
  if (!communityType) {
    throw new ApiError("Invalid community type ID", 400);
  }

  // Ensure userId is available
  if (!userId) {
    throw new ApiError("User ID is required to create a community", 401);
  }

  const community = await Community.create({
    userId,
    communityTypeId,
    communityName,
    isRegistered: isRegistered !== undefined ? isRegistered : 0,
    registrationDate: registrationDate || null,
    contactPerson: contactPerson || null,
    contactNumber: contactNumber || null,
    email: email || null,
    totalMember: totalMember !== undefined ? totalMember : 0,
    fullAddress: fullAddress || null,
    status: status !== undefined ? status : 1,
    createdBy: userId,
    updatedBy: userId
  });

  // Fetch the created community with relations
  const createdCommunity = await Community.findByPk(community.id, {
    include: [
      {
        model: MetaCommunityType,
        as: "communityType",
        attributes: ["id", "dispName"]
      }
    ]
  });

  sendCreated(res, createdCommunity, "Community created successfully");
});

/**
 * Update a community
 * PUT /api/communities/:id
 */
export const updateCommunity = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const {
    communityTypeId,
    communityName,
    isRegistered,
    registrationDate,
    contactPerson,
    contactNumber,
    email,
    totalMember,
    fullAddress,
    status
  } = req.body;
  const userId = req.user?.id;

  const community = await Community.findByPk(id);

  if (!community) {
    return sendNotFound(res, "Community not found");
  }

  // Verify community type exists if being changed
  if (communityTypeId && communityTypeId !== community.communityTypeId) {
    const communityType = await MetaCommunityType.findByPk(communityTypeId);
    if (!communityType) {
      throw new ApiError("Invalid community type ID", 400);
    }
  }

  // Update only provided fields
  if (communityTypeId !== undefined) community.communityTypeId = communityTypeId;
  if (communityName !== undefined) community.communityName = communityName;
  if (isRegistered !== undefined) community.isRegistered = isRegistered;
  if (registrationDate !== undefined) community.registrationDate = registrationDate;
  if (contactPerson !== undefined) community.contactPerson = contactPerson;
  if (contactNumber !== undefined) community.contactNumber = contactNumber;
  if (email !== undefined) community.email = email;
  if (totalMember !== undefined) community.totalMember = totalMember;
  if (fullAddress !== undefined) community.fullAddress = fullAddress;
  if (status !== undefined) community.status = status;
  if (userId) community.updatedBy = userId;

  await community.save();

  // Fetch updated community with relations
  const updatedCommunity = await Community.findByPk(id, {
    include: [
      {
        model: MetaCommunityType,
        as: "communityType",
        attributes: ["id", "dispName"]
      }
    ]
  });

  sendSuccess(res, updatedCommunity, "Community updated successfully");
});

/**
 * Delete a community
 * DELETE /api/communities/:id
 */
export const deleteCommunity = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const community = await Community.findByPk(id);

  if (!community) {
    return sendNotFound(res, "Community not found");
  }

  await community.destroy();

  sendNoContent(res);
});

/**
 * Toggle community status (activate/deactivate)
 * PATCH /api/communities/:id/status
 */
export const toggleCommunityStatus = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user?.id;

    const community = await Community.findByPk(id);

    if (!community) {
      return sendNotFound(res, "Community not found");
    }

    if (status === undefined) {
      throw new ApiError("Status field is required", 400);
    }

    community.status = status;
    if (userId) community.updatedBy = userId;
    await community.save();

    const updatedCommunity = await Community.findByPk(id, {
      include: [
        {
          model: MetaCommunityType,
          as: "communityType",
          attributes: ["id", "dispName"]
        }
      ]
    });

    sendSuccess(res, updatedCommunity, "Community status updated successfully");
  }
);

/**
 * Update community member count
 * PATCH /api/communities/:id/member-count
 */
export const updateMemberCount = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { totalMember } = req.body;
  const userId = req.user?.id;

  const community = await Community.findByPk(id);

  if (!community) {
    return sendNotFound(res, "Community not found");
  }

  if (totalMember === undefined) {
    throw new ApiError("totalMember field is required", 400);
  }

  community.totalMember = totalMember;
  if (userId) community.updatedBy = userId;
  await community.save();

  const updatedCommunity = await Community.findByPk(id, {
    include: [
      {
        model: MetaCommunityType,
        as: "communityType",
        attributes: ["id", "dispName"]
      }
    ]
  });

  sendSuccess(res, updatedCommunity, "Community member count updated successfully");
});
