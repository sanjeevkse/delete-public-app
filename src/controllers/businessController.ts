import type { Request, Response } from "express";
import { Op } from "sequelize";
import type { Attributes, WhereOptions } from "sequelize";

import { ApiError } from "../middlewares/errorHandler";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import Business from "../models/Business";
import MetaBusinessType from "../models/MetaBusinessType";
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
 * List all businesses with pagination and search
 * GET /api/businesses
 * Query params:
 *   - includeAuditFields=true : Include audit fields (createdBy, createdAt, updatedBy, updatedAt, status)
 */
export const listBusinesses = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = parsePaginationParams(
    req.query.page as string,
    req.query.limit as string,
    25,
    100
  );
  const search = (req.query.search as string) ?? "";
  const status = req.query.status as string;
  const businessTypeId = req.query.businessTypeId as string;
  const includeAuditFields = shouldIncludeAuditFields(req.query);

  const filters: WhereOptions<Attributes<Business>>[] = [];

  if (search) {
    filters.push({
      [Op.or]: [
        { businessName: { [Op.like]: `%${search}%` } },
        { pan: { [Op.like]: `%${search}%` } },
        { gstin: { [Op.like]: `%${search}%` } },
        { contactNumber: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { fullAddress: { [Op.like]: `%${search}%` } }
      ]
    });
  }

  if (status !== undefined) {
    filters.push({ status: Number.parseInt(status, 10) });
  }

  if (businessTypeId) {
    filters.push({ businessTypeId: Number.parseInt(businessTypeId, 10) });
  }

  const where: WhereOptions<Attributes<Business>> | undefined = filters.length
    ? { [Op.and]: filters }
    : undefined;

  const { rows, count } = await Business.findAndCountAll({
    where,
    attributes: buildQueryAttributes({ includeAuditFields, keepFields: ["createdAt"] }),
    include: [
      {
        model: MetaBusinessType,
        as: "businessType",
        attributes: ["id", "dispName", "description", "icon"]
      }
    ],
    limit,
    offset,
    order: [["createdAt", "DESC"]]
  });

  const pagination = calculatePagination(count, page, limit);

  return sendSuccessWithPagination(res, rows, pagination, "Businesses retrieved successfully");
});

/**
 * Get a single business by ID
 * GET /api/businesses/:id
 * Query params:
 *   - includeAuditFields=true : Include audit fields (createdBy, createdAt, updatedBy, updatedAt, status)
 */
export const getBusiness = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const includeAuditFields = shouldIncludeAuditFields(req.query);

  const business = await Business.findByPk(id, {
    attributes: buildQueryAttributes({ includeAuditFields }),
    include: [
      {
        model: MetaBusinessType,
        as: "businessType",
        attributes: ["id", "dispName", "description", "icon"]
      }
    ]
  });

  if (!business) {
    return sendNotFound(res, "Business not found");
  }

  return sendSuccess(res, business, "Business retrieved successfully");
});

/**
 * Create a new business
 * POST /api/businesses
 */
export const createBusiness = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  assertNoRestrictedFields(req.body);

  const {
    businessName,
    businessTypeId,
    pan,
    gstin,
    contactNumber,
    email,
    totalEmployees,
    turnoverYearly,
    fullAddress
  } = req.body;
  const userId = req.user?.id;

  // Validate required fields
  if (!businessName || !businessTypeId) {
    throw new ApiError("Missing required fields: businessName, businessTypeId", 400);
  }

  // Verify business type exists
  const businessType = await MetaBusinessType.findByPk(businessTypeId);
  if (!businessType) {
    throw new ApiError("Invalid business type ID", 400);
  }

  // Check if PAN already exists
  if (pan) {
    const existingBusiness = await Business.findOne({ where: { pan } });
    if (existingBusiness) {
      throw new ApiError("A business with this PAN already exists", 409);
    }
  }

  // Check if GSTIN already exists
  if (gstin) {
    const existingBusiness = await Business.findOne({ where: { gstin } });
    if (existingBusiness) {
      throw new ApiError("A business with this GSTIN already exists", 409);
    }
  }

  const business = await Business.create({
    businessName,
    businessTypeId,
    pan: pan || null,
    gstin: gstin || null,
    contactNumber: contactNumber || null,
    email: email || null,
    totalEmployees: totalEmployees || null,
    turnoverYearly: turnoverYearly || null,
    fullAddress: fullAddress || null,
    status: 1,
    createdBy: userId || null,
    updatedBy: userId || null
  });

  // Fetch the created business with relations
  const createdBusiness = await Business.findByPk(business.id, {
    include: [
      {
        model: MetaBusinessType,
        as: "businessType",
        attributes: ["id", "dispName", "description", "icon"]
      }
    ]
  });

  return sendCreated(res, createdBusiness, "Business created successfully");
});

/**
 * Update a business
 * PUT /api/businesses/:id
 */
export const updateBusiness = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  assertNoRestrictedFields(req.body);

  const {
    businessName,
    businessTypeId,
    pan,
    gstin,
    contactNumber,
    email,
    totalEmployees,
    turnoverYearly,
    fullAddress
  } = req.body;
  const userId = req.user?.id;

  const business = await Business.findByPk(id);

  if (!business) {
    return sendNotFound(res, "Business not found");
  }

  // Verify business type exists if being changed
  if (businessTypeId && businessTypeId !== business.businessTypeId) {
    const businessType = await MetaBusinessType.findByPk(businessTypeId);
    if (!businessType) {
      throw new ApiError("Invalid business type ID", 400);
    }
  }

  // Check if PAN is being changed and if it already exists
  if (pan && pan !== business.pan) {
    const existingBusiness = await Business.findOne({
      where: {
        pan,
        id: { [Op.ne]: id }
      }
    });
    if (existingBusiness) {
      throw new ApiError("A business with this PAN already exists", 409);
    }
  }

  // Check if GSTIN is being changed and if it already exists
  if (gstin && gstin !== business.gstin) {
    const existingBusiness = await Business.findOne({
      where: {
        gstin,
        id: { [Op.ne]: id }
      }
    });
    if (existingBusiness) {
      throw new ApiError("A business with this GSTIN already exists", 409);
    }
  }

  // Update only provided fields
  if (businessName !== undefined) business.businessName = businessName;
  if (businessTypeId !== undefined) business.businessTypeId = businessTypeId;
  if (pan !== undefined) business.pan = pan;
  if (gstin !== undefined) business.gstin = gstin;
  if (contactNumber !== undefined) business.contactNumber = contactNumber;
  if (email !== undefined) business.email = email;
  if (totalEmployees !== undefined) business.totalEmployees = totalEmployees;
  if (turnoverYearly !== undefined) business.turnoverYearly = turnoverYearly;
  if (fullAddress !== undefined) business.fullAddress = fullAddress;
  if (userId) business.updatedBy = userId;

  await business.save();

  // Fetch updated business with relations
  const updatedBusiness = await Business.findByPk(id, {
    include: [
      {
        model: MetaBusinessType,
        as: "businessType",
        attributes: ["id", "dispName", "description", "icon"]
      }
    ]
  });

  return sendSuccess(res, updatedBusiness, "Business updated successfully");
});

/**
 * Delete a business
 * DELETE /api/businesses/:id
 */
export const deleteBusiness = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const business = await Business.findByPk(id);

  if (!business) {
    return sendNotFound(res, "Business not found");
  }

  await business.update({ status: 0 });

  sendNoContent(res);
});

/**
 * Toggle business status (activate/deactivate)
 * PATCH /api/businesses/:id/status
 */
export const toggleBusinessStatus = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user?.id;

    const business = await Business.findByPk(id);

    if (!business) {
      return sendNotFound(res, "Business not found");
    }

    if (status === undefined) {
      throw new ApiError("Status field is required", 400);
    }

    business.status = status;
    if (userId) business.updatedBy = userId;
    await business.save();

    const updatedBusiness = await Business.findByPk(id, {
      include: [
        {
          model: MetaBusinessType,
          as: "businessType",
          attributes: ["id", "dispName", "description", "icon"]
        }
      ]
    });

    return sendSuccess(res, updatedBusiness, "Business status updated successfully");
  }
);
