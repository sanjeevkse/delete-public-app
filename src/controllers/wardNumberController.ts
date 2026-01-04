import type { Response } from "express";
import { Op } from "sequelize";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { ApiError } from "../middlewares/errorHandler";
import MetaWardNumber from "../models/MetaWardNumber";
import asyncHandler from "../utils/asyncHandler";
import { assertNoRestrictedFields } from "../utils/payloadValidation";
import {
  sendSuccess,
  sendCreated,
  sendNotFound,
  parsePaginationParams,
  sendSuccessWithPagination,
  calculatePagination,
  parseSortDirection,
  validateSortColumn
} from "../utils/apiResponse";
import {
  applyAccessibilityFilterToList,
  validateItemAccess,
  userHasAccessibilityConfigured,
  getAccessibleIds
} from "../utils/accessibilityControllerHelper";
import { getUserAccessList } from "../services/userAccessibilityService";

export const createWardNumber = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  assertNoRestrictedFields(req.body);

  const { dispName } = req.body;

  if (!dispName) {
    throw new ApiError("dispName is required", 400);
  }

  const existingWardNumber = await MetaWardNumber.findOne({ where: { dispName } });
  if (existingWardNumber) {
    throw new ApiError("Ward number with this name already exists", 409);
  }

  const wardNumber = await MetaWardNumber.create({
    dispName,
    status: 1,
    createdBy: req.user?.id,
    updatedBy: req.user?.id
  });

  return sendCreated(res, wardNumber, "Ward number created successfully");
});

export const listWardNumbers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { page, limit, offset } = parsePaginationParams(
    req.query.page as string,
    req.query.limit as string
  );
  const sortDirection = parseSortDirection(req.query.sort, "ASC");
  const sortColumn = validateSortColumn(
    req.query.sortColumn,
    ["id", "dispName", "createdAt"],
    "dispName"
  );
  const { search, status } = req.query;

  const whereClause: any = {};

  if (search && typeof search === "string") {
    whereClause[Op.or] = [{ dispName: { [Op.like]: `%${search}%` } }];
  }

  if (status !== undefined) {
    whereClause.status = status;
  }

  // Apply accessibility filter - restrict to wards in user's accessible zones
  const debugMode = req.query.debug === "true";
  let debugInfo: any = {};

  if (req.user?.id) {
    const userAccessList = await getUserAccessList(req.user.id);

    if (debugMode) {
      debugInfo.userId = req.user.id;
      debugInfo.userAccessList = userAccessList;
    }

    const hasAccess = applyAccessibilityFilterToList(whereClause, userAccessList, "wardNumberId");

    if (debugMode) {
      debugInfo.hasAccess = hasAccess;
      debugInfo.whereClauseAfterFilter = whereClause;
    }

    if (!hasAccess) {
      // User has accessibility configured but no ward access
      const pagination = calculatePagination(0, page, limit);
      const response = {
        success: true,
        data: [],
        pagination,
        message: "Ward numbers retrieved successfully"
      };
      if (debugMode) {
        (response as any).debug = debugInfo;
      }
      return res.status(200).json(response);
    }
  }

  const { count, rows } = await MetaWardNumber.findAndCountAll({
    where: whereClause,
    limit,
    offset,
    order: [[sortColumn, sortDirection]]
  });

  let responseData = rows;
  let totalCount = count;

  // Prepend "ALL" option if need_all=1
  if (req.query.need_all === "1") {
    responseData = [{ id: -1, dispName: "-ALL-" }, ...rows];
    totalCount = count + 1;
  }

  const pagination = calculatePagination(totalCount, page, limit);

  if (debugMode) {
    const response = {
      success: true,
      data: responseData,
      pagination,
      message: "Ward numbers retrieved successfully",
      debug: {
        ...debugInfo,
        queryWhereClause: whereClause,
        resultCount: rows.length
      }
    };
    return res.status(200).json(response);
  }

  return sendSuccessWithPagination(
    res,
    responseData,
    pagination,
    "Ward numbers retrieved successfully"
  );
});

export const getWardNumberById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const wardNumber = await MetaWardNumber.findByPk(id);

  if (!wardNumber) {
    throw new ApiError("Ward number not found", 404);
  }

  // Check accessibility - user must have access to this ward
  if (req.user?.id) {
    const userAccessList = await getUserAccessList(req.user.id);

    if (userHasAccessibilityConfigured(userAccessList)) {
      if (!validateItemAccess(userAccessList, Number(id), "wardNumberId")) {
        throw new ApiError("Ward number not found", 404);
      }
    }
  }

  return sendSuccess(res, wardNumber, "Ward number retrieved successfully");
});

export const updateWardNumber = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  assertNoRestrictedFields(req.body);

  const { dispName } = req.body;

  const wardNumber = await MetaWardNumber.findByPk(id);

  if (!wardNumber) {
    throw new ApiError("Ward number not found", 404);
  }

  if (dispName && dispName !== wardNumber.dispName) {
    const existingWardNumber = await MetaWardNumber.findOne({ where: { dispName } });
    if (existingWardNumber) {
      throw new ApiError("Ward number with this name already exists", 409);
    }
  }

  await wardNumber.update({
    dispName: dispName || wardNumber.dispName,
    updatedBy: req.user?.id
  });

  return sendSuccess(res, wardNumber, "Ward number updated successfully");
});

export const toggleWardNumberStatus = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const wardNumber = await MetaWardNumber.findByPk(id);

    if (!wardNumber) {
      throw new ApiError("Ward number not found", 404);
    }

    await wardNumber.update({
      status: wardNumber.status === 1 ? 0 : 1,
      updatedBy: req.user?.id
    });

    return sendSuccess(res, wardNumber, "Ward number status toggled successfully");
  }
);

export const deleteWardNumber = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const wardNumber = await MetaWardNumber.findByPk(id);

  if (!wardNumber) {
    throw new ApiError("Ward number not found", 404);
  }

  await wardNumber.update({ status: 0 });

  return sendSuccess(res, null, "Ward number deleted successfully");
});
