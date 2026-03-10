import type { Response } from "express";
import { QueryTypes } from "sequelize";

import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { ApiError } from "../middlewares/errorHandler";
import sequelize from "../config/database";
import asyncHandler from "../utils/asyncHandler";
import { sendSuccess } from "../utils/apiResponse";

type MainCasteRow = {
  id: number;
  dispName: string;
};

type SubCasteRow = {
  id: number;
  dispName: string;
  categoryId: number | null;
  categoryName: string | null;
};

const pickQueryValue = (
  query: AuthenticatedRequest["query"],
  keys: string[]
): string | undefined => {
  for (const key of keys) {
    const value = query[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim()) {
      return value[0].trim();
    }
  }
  return undefined;
};

const parseRequiredId = (raw: string | undefined, fieldLabel: string): number => {
  if (!raw) {
    throw new ApiError(`${fieldLabel} is required`, 400);
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new ApiError(`Invalid ${fieldLabel}`, 400);
  }
  return value;
};

const parseOptionalId = (raw: string | undefined, fieldLabel: string): number | undefined => {
  if (!raw) return undefined;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new ApiError(`Invalid ${fieldLabel}`, 400);
  }
  return value;
};

export const getCasteRelations = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const religionId = parseRequiredId(
    pickQueryValue(req.query, ["religionId", "religion_id"]),
    "religion_id"
  );
  const mainCasteId = parseOptionalId(
    pickQueryValue(req.query, ["mainCasteId", "main_caste_id"]),
    "main_caste_id"
  );
  const subCasteId = parseOptionalId(
    pickQueryValue(req.query, ["subCasteId", "sub_caste_id"]),
    "sub_caste_id"
  );

  if (subCasteId !== undefined && mainCasteId === undefined) {
    throw new ApiError("main_caste_id is required when sub_caste_id is provided", 400);
  }

  if (mainCasteId === undefined) {
    const mainCastes = await sequelize.query<MainCasteRow>(
      `
        SELECT DISTINCT
          mc.id AS id,
          mc.disp_name AS dispName
        FROM tbl_meta_caste_relation AS cr
        INNER JOIN tbl_meta_main_caste AS mc ON mc.id = cr.main_caste_id AND mc.status = 1
        WHERE cr.religion_id = :religionId
        ORDER BY mc.disp_name ASC
      `,
      { replacements: { religionId }, type: QueryTypes.SELECT }
    );

    return sendSuccess(res, mainCastes, "Caste relations retrieved successfully");
  }

  const where: string[] = ["cr.religion_id = :religionId", "cr.main_caste_id = :mainCasteId"];
  const replacements: Record<string, number> = { religionId, mainCasteId };
  if (subCasteId !== undefined) {
    where.push("cr.sub_caste_id = :subCasteId");
    replacements.subCasteId = subCasteId;
  }

  const subCastes = await sequelize.query<SubCasteRow>(
    `
      SELECT DISTINCT
        sc.id AS id,
        sc.disp_name AS dispName,
        scc.id AS categoryId,
        scc.disp_name AS categoryName
      FROM tbl_meta_caste_relation AS cr
      INNER JOIN tbl_meta_sub_caste AS sc ON sc.id = cr.sub_caste_id AND sc.status = 1
      LEFT JOIN tbl_meta_sub_caste_category AS scc
        ON scc.id = cr.sub_caste_category_id AND scc.status = 1
      WHERE ${where.join(" AND ")}
      ORDER BY sc.disp_name ASC
    `,
    { replacements, type: QueryTypes.SELECT }
  );

  return sendSuccess(
    res,
    subCastes.map((row) => ({
      id: row.id,
      dispName: row.dispName,
      category: row.categoryId
        ? {
            id: row.categoryId,
            dispName: row.categoryName
          }
        : null
    })),
    "Caste relations retrieved successfully"
  );
});

export default { getCasteRelations };
