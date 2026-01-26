import type { Response } from "express";
import { Op } from "sequelize";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { ApiError } from "../middlewares/errorHandler";
import GeoPolitical from "../models/GeoPolitical";
import MetaBoothNumber from "../models/MetaBoothNumber";
import MetaMlaConstituency from "../models/MetaMlaConstituency";
import asyncHandler from "../utils/asyncHandler";
import { assertNoRestrictedFields } from "../utils/payloadValidation";
import {
  sendSuccess,
  sendCreated,
  parsePaginationParams,
  sendSuccessWithPagination,
  calculatePagination,
  validateSortColumn,
  parseSortDirection
} from "../utils/apiResponse";
import {
  applyAccessibilityFilterToList,
  validateItemAccess,
  userHasAccessibilityConfigured,
  combineAccessibilityFilters
} from "../utils/accessibilityControllerHelper";
import { getUserAccessList } from "../services/userAccessibilityService";

export const createBoothNumber = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  assertNoRestrictedFields(req.body);

  const { mlaConstituencyId, dispName } = req.body;

  if (!mlaConstituencyId) {
    throw new ApiError("mlaConstituencyId is required", 400);
  }

  if (!dispName) {
    throw new ApiError("dispName is required", 400);
  }

  // Verify MLA constituency exists
  const mlaConstituency = await MetaMlaConstituency.findByPk(mlaConstituencyId);
  if (!mlaConstituency) {
    throw new ApiError("MLA constituency not found", 404);
  }

  const boothNumber = await MetaBoothNumber.create({
    mlaConstituencyId,
    dispName,
    status: 1,
    createdBy: req.user?.id,
    updatedBy: req.user?.id
  });

  return sendCreated(res, boothNumber, "Booth number created successfully");
});

export const listBoothNumbers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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
  const { search, status, mlaConstituencyId, wardNumberId } = req.query;

  const whereClause: any = {};

  if (search && typeof search === "string") {
    whereClause[Op.or] = [{ dispName: { [Op.like]: `%${search}%` } }];
  }

  if (status !== undefined) {
    whereClause.status = status;
  }

  if (mlaConstituencyId) {
    whereClause.mlaConstituencyId = mlaConstituencyId;
  }

  // Apply accessibility filter - restrict to booths in user's accessible zones
  if (req.user?.id) {
    const userAccessList = await getUserAccessList(req.user.id);

    const hasAccess = applyAccessibilityFilterToList(whereClause, userAccessList, "boothNumberId");
    if (!hasAccess) {
      // User has accessibility configured but no booth access
      const pagination = calculatePagination(0, page, limit);
      return sendSuccessWithPagination(res, [], pagination, "Booth numbers retrieved successfully");
    }

    // If no ward filter provided, also filter by accessible wards
    if (!wardNumberId && userAccessList.length > 0) {
      // Get accessible ward IDs
      const accessibleWards = userAccessList
        .map((access) => access.wardNumberId)
        .filter((id): id is number => id !== null && id !== undefined && id !== -1);

      // If user has -1 (all wards), no need to filter by ward
      const hasAllWards = userAccessList.some((access) => access.wardNumberId === -1);

      if (!hasAllWards && accessibleWards.length > 0) {
        // Get all booths in accessible wards
        const geoPoliticals = await GeoPolitical.findAll({
          where: { wardNumberId: { [Op.in]: accessibleWards } },
          attributes: ["boothNumberId"],
          raw: true
        });

        const boothsInAccessibleWards = [...new Set(geoPoliticals.map((gp) => gp.boothNumberId))];

        if (boothsInAccessibleWards.length > 0) {
          // Intersect with accessible booth IDs if already filtered
          if (whereClause.id && whereClause.id[Op.in]) {
            const accessibleBoothIds = whereClause.id[Op.in];
            const filteredIds = boothsInAccessibleWards.filter((id) =>
              accessibleBoothIds.includes(id)
            );
            if (filteredIds.length > 0) {
              whereClause.id = { [Op.in]: filteredIds };
            } else {
              const pagination = calculatePagination(0, page, limit);
              return sendSuccessWithPagination(
                res,
                [],
                pagination,
                "Booth numbers retrieved successfully"
              );
            }
          } else {
            whereClause.id = { [Op.in]: boothsInAccessibleWards };
          }
        } else {
          const pagination = calculatePagination(0, page, limit);
          return sendSuccessWithPagination(
            res,
            [],
            pagination,
            "Booth numbers retrieved successfully"
          );
        }
      }
    }
  }

  // If filtering by ward number, find booth numbers through GeoPolitical table
  if (wardNumberId) {
    const wardId = Number(wardNumberId);

    // If wardNumberId is -1, return all booths from all wards (no ward filter needed)
    if (wardId !== -1) {
      const geoPoliticals = await GeoPolitical.findAll({
        where: { wardNumberId: wardId },
        attributes: ["boothNumberId"]
      });

      const boothNumberIds = [...new Set(geoPoliticals.map((gp) => gp.boothNumberId))];

      if (boothNumberIds.length > 0) {
        // Apply additional accessibility filter if configured
        if (whereClause.id && whereClause.id[Op.in]) {
          // User has booth accessibility filter - intersect with ward booths
          const accessibleIds = whereClause.id[Op.in];
          const filteredIds = boothNumberIds.filter((id) => accessibleIds.includes(id));
          if (filteredIds.length > 0) {
            whereClause.id = { [Op.in]: filteredIds };
          } else {
            // Ward has booths but user can't access any
            const pagination = calculatePagination(0, page, limit);
            return sendSuccessWithPagination(
              res,
              [],
              pagination,
              "Booth numbers retrieved successfully"
            );
          }
        } else {
          whereClause.id = { [Op.in]: boothNumberIds };
        }
      } else {
        // No booths found for this ward, return empty result
        const pagination = calculatePagination(0, page, limit);
        return sendSuccessWithPagination(
          res,
          [],
          pagination,
          "Booth numbers retrieved successfully"
        );
      }
    }
    // If wardNumberId is -1, we don't filter by ward and return all booths
  }

  const { count, rows } = await MetaBoothNumber.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: MetaMlaConstituency,
        as: "mlaConstituency",
        attributes: ["id", "dispName", "status"]
      }
    ],
    limit,
    offset,
    order: [[sortColumn, sortDirection]]
  });

  let responseData = rows;
  let totalCount = count;

  // Prepend "ALL" option if need_all=1
  if (req.query.need_all === "1") {
    responseData = [{ id: -1, dispName: "-ALL-" } as any, ...rows];
    totalCount = count + 1;
  }

  const pagination = calculatePagination(totalCount, page, limit);

  return sendSuccessWithPagination(
    res,
    responseData,
    pagination,
    "Booth numbers retrieved successfully"
  );
});

export const getBoothNumberById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const boothNumber = await MetaBoothNumber.findByPk(id, {
    include: [
      {
        model: MetaMlaConstituency,
        as: "mlaConstituency",
        attributes: ["id", "dispName", "status"]
      }
    ]
  });

  if (!boothNumber) {
    throw new ApiError("Booth number not found", 404);
  }

  // Check accessibility - user must have access to this booth
  if (req.user?.id) {
    const userAccessList = await getUserAccessList(req.user.id);

    if (userHasAccessibilityConfigured(userAccessList)) {
      if (!validateItemAccess(userAccessList, Number(id), "boothNumberId")) {
        throw new ApiError("Booth number not found", 404);
      }
    }
  }

  return sendSuccess(res, boothNumber, "Booth number retrieved successfully");
});

export const updateBoothNumber = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  assertNoRestrictedFields(req.body);

  const { mlaConstituencyId, dispName } = req.body;

  const boothNumber = await MetaBoothNumber.findByPk(id);

  if (!boothNumber) {
    throw new ApiError("Booth number not found", 404);
  }

  // Verify MLA constituency exists if provided
  if (mlaConstituencyId && mlaConstituencyId !== boothNumber.mlaConstituencyId) {
    const mlaConstituency = await MetaMlaConstituency.findByPk(mlaConstituencyId);
    if (!mlaConstituency) {
      throw new ApiError("MLA constituency not found", 404);
    }
  }

  await boothNumber.update({
    mlaConstituencyId: mlaConstituencyId || boothNumber.mlaConstituencyId,
    dispName: dispName || boothNumber.dispName,
    updatedBy: req.user?.id
  });

  const updatedBoothNumber = await MetaBoothNumber.findByPk(id, {
    include: [
      {
        model: MetaMlaConstituency,
        as: "mlaConstituency",
        attributes: ["id", "dispName", "status"]
      }
    ]
  });

  return sendSuccess(res, updatedBoothNumber, "Booth number updated successfully");
});

export const toggleBoothNumberStatus = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const boothNumber = await MetaBoothNumber.findByPk(id);

    if (!boothNumber) {
      throw new ApiError("Booth number not found", 404);
    }

    await boothNumber.update({
      status: boothNumber.status === 1 ? 0 : 1,
      updatedBy: req.user?.id
    });

    return sendSuccess(res, boothNumber, "Booth number status toggled successfully");
  }
);

export const deleteBoothNumber = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const boothNumber = await MetaBoothNumber.findByPk(id);

  if (!boothNumber) {
    throw new ApiError("Booth number not found", 404);
  }

  await boothNumber.update({ status: 0 });

  return sendSuccess(res, null, "Booth number deleted successfully");
});
