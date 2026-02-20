import type { Response } from "express";
import { Op } from "sequelize";
import type { Attributes, WhereOptions } from "sequelize";

import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { requireAuthenticatedUser } from "../middlewares/authMiddleware";
import Business from "../models/Business";
import MetaBusinessCategory from "../models/MetaBusinessCategory";
import MetaBusinessType from "../models/MetaBusinessType";
import asyncHandler from "../utils/asyncHandler";
import { ApiError } from "../middlewares/errorHandler";
import sequelize from "../config/database";
import { sendSuccess } from "../utils/apiResponse";
import { buildQueryAttributes } from "../utils/queryAttributes";

const formatDateTime = (value: Date | string | null | undefined): string | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const pad2 = (num: number) => String(num).padStart(2, "0");
  const dd = pad2(date.getDate());
  const mm = pad2(date.getMonth() + 1);
  const yyyy = date.getFullYear();
  const hh = pad2(date.getHours());
  const min = pad2(date.getMinutes());
  const ss = pad2(date.getSeconds());
  return `${dd}-${mm}-${yyyy} ${hh}:${min}:${ss}`;
};

const parseOptionalNumber = (raw: string | undefined, fieldLabel: string): number | undefined => {
  if (raw === undefined || raw === "") return undefined;
  const num = Number(raw);
  if (!Number.isFinite(num)) {
    throw new ApiError(`Invalid ${fieldLabel}`, 400);
  }
  return Math.trunc(num);
};

/**
 * Business report with metrics and tabular data
 * GET /reports/business
 * Query params:
 *   - page, limit
 *   - search
 *   - status
 *   - businessTypeId
 *   - businessCategoryId
 */
export const getBusinessReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);

  const search = (req.query.search as string) ?? "";
  const status = parseOptionalNumber(req.query.status as string | undefined, "status");
  const businessTypeId = parseOptionalNumber(
    req.query.businessTypeId as string | undefined,
    "businessTypeId"
  );
  const businessCategoryId = parseOptionalNumber(
    req.query.businessCategoryId as string | undefined,
    "businessCategoryId"
  );

  const filters: WhereOptions<Attributes<Business>>[] = [{ createdBy: userId }];

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
    filters.push({ status });
  }
  if (businessTypeId !== undefined) {
    filters.push({ businessTypeId });
  }
  if (businessCategoryId !== undefined) {
    filters.push({ businessCategoryId });
  }

  const where: WhereOptions<Attributes<Business>> = { [Op.and]: filters };

  const [metricsCounts, categories, businesses] = await Promise.all([
    Business.findAll({
      attributes: [
        "businessCategoryId",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"]
      ],
      where: status === undefined ? { createdBy: userId } : { createdBy: userId, status },
      group: ["businessCategoryId"],
      raw: true
    }),
    MetaBusinessCategory.findAll({
      attributes: ["id", "dispName"],
      where: { status: 1 },
      order: [["dispName", "ASC"]],
      raw: true
    }),
    Business.findAll({
      where,
      attributes: buildQueryAttributes({ includeAuditFields: true }),
      include: [
        {
          model: MetaBusinessType,
          as: "businessType",
          attributes: ["id", "dispName", "description", "icon"]
        },
        {
          model: MetaBusinessCategory,
          as: "businessCategory",
          attributes: ["id", "dispName", "description", "icon"]
        }
      ],
      order: [["createdAt", "DESC"]]
    })
  ]);

  const countByCategory = new Map<number, number>();
  let uncategorizedCount = 0;
  for (const row of metricsCounts as Array<any>) {
    const rawId = row.businessCategoryId;
    const countValue = Number(row.count) || 0;
    if (rawId === null || rawId === undefined) {
      uncategorizedCount += countValue;
      continue;
    }
    countByCategory.set(Number(rawId), countValue);
  }

  type CategoryStat = { id: number | null; name: string; count: number };
  const categoryStats: CategoryStat[] = (categories as Array<any>)
    .map((category) => ({
      id: Number(category.id),
      name: category.dispName,
      count: countByCategory.get(Number(category.id)) ?? 0
    }))
    .filter((category) => category.count > 0);

  if (uncategorizedCount > 0) {
    categoryStats.push({ id: null, name: "Uncategorized", count: uncategorizedCount });
  }

  const totalBusinesses = categoryStats.reduce((sum, item) => sum + item.count, 0);

  const headers = [
    "SL No.",
    "Business Category",
    "Business Type",
    "Business Name",
    "PAN",
    "GSTIN",
    "Contact Number",
    "Email",
    "Total Employees",
    "Turnover (Yearly)",
    "Full Address",
    "Latitude",
    "Longitude",
    "Photo URL",
    "Status",
    "Created At",
    "Updated At"
  ];

  type TabularCell = string | number | null;
  const tabularRows: TabularCell[][] = (businesses || []).map((business, index) => {
    const rowNumber = index + 1;
    return [
      rowNumber,
      business.businessCategory?.dispName ?? null,
      business.businessType?.dispName ?? null,
      business.businessName ?? null,
      business.pan ?? null,
      business.gstin ?? null,
      business.contactNumber ?? null,
      business.email ?? null,
      business.totalEmployees ?? null,
      business.turnoverYearly ?? null,
      business.fullAddress ?? null,
      business.latitude ?? null,
      business.longitude ?? null,
      business.photoUrl ?? null,
      business.status ?? null,
      formatDateTime(business.createdAt ?? null),
      formatDateTime(business.updatedAt ?? null)
    ];
  });

  const reportData = {
    filters: {
      search: search || null,
      status: status ?? null,
      businessTypeId: businessTypeId ?? null,
      businessCategoryId: businessCategoryId ?? null
    },
    metrics: {
      totalBusinesses,
      categories: categoryStats
    },
    tabularData: {
      headers,
      data: tabularRows
    }
  };

  return sendSuccess(res, reportData, "Business report retrieved successfully");
});

export default { getBusinessReport };
