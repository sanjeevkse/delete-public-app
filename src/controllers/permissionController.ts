import type { Request, Response } from "express";

import MetaPermission from "../models/MetaPermission";
import asyncHandler from "../utils/asyncHandler";
import {
  sendSuccessWithPagination,
  parsePaginationParams,
  validateSortColumn,
  calculatePagination,
  parseSortDirection
} from "../utils/apiResponse";

export const listPermissions = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = parsePaginationParams(
    req.query.page as string,
    req.query.limit as string,
    10,
    100
  );
  const sortDirection = parseSortDirection(req.query.sort, "ASC");
  const sortColumn = validateSortColumn(
    req.query.sortColumn,
    ["id", "permissionKey", "dispName", "createdAt"],
    "id"
  );

  const { rows, count } = await MetaPermission.findAndCountAll({
    include: [{ association: "group" }],
    limit,
    offset,
    order: [[sortColumn, sortDirection]],
    distinct: true
  });

  const pagination = calculatePagination(count, page, limit);
  return sendSuccessWithPagination(res, rows, pagination, "Permissions retrieved successfully");
});
