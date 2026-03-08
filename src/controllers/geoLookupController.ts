import type { Response } from "express";
import { QueryTypes } from "sequelize";

import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { ApiError } from "../middlewares/errorHandler";
import sequelize from "../config/database";
import asyncHandler from "../utils/asyncHandler";
import {
  calculatePagination,
  parsePaginationParams,
  parseSortDirection,
  sendSuccessWithPagination,
  validateSortColumn
} from "../utils/apiResponse";

type RequestEntity =
  | "mp_constituency"
  | "mla_constituency"
  | "gram_panchayat"
  | "village"
  | "ward"
  | "booth";

interface EntityConfig {
  tableName: string;
  idColumn: string;
  labelColumn: string;
}

const ENTITY_CONFIG: Record<RequestEntity, EntityConfig> = {
  mp_constituency: {
    tableName: "tbl_meta_mp_constituency",
    idColumn: "mp_constituency_id",
    labelColumn: "disp_name"
  },
  mla_constituency: {
    tableName: "tbl_meta_mla_constituency",
    idColumn: "mla_constituency_id",
    labelColumn: "disp_name"
  },
  gram_panchayat: {
    tableName: "tbl_meta_gram_panchayat",
    idColumn: "gram_panchayat_id",
    labelColumn: "disp_name"
  },
  village: {
    tableName: "tbl_meta_main_village",
    idColumn: "main_village_id",
    labelColumn: "disp_name"
  },
  ward: {
    tableName: "tbl_meta_ward_number",
    idColumn: "ward_number_id",
    labelColumn: "disp_name"
  },
  booth: {
    tableName: "tbl_meta_booth_number",
    idColumn: "booth_number_id",
    labelColumn: "disp_name"
  }
};

const parseOptionalPositiveInt = (value: unknown, field: string): number | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ApiError(`${field} must be a valid positive number`, 400);
  }

  return parsed;
};

const parseOptionalString = (value: unknown): string | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : undefined;
};

const getQueryValue = (query: AuthenticatedRequest["query"], keys: string[]): unknown => {
  for (const key of keys) {
    const value = query[key];
    if (Array.isArray(value)) {
      if (value.length > 0 && value[0] !== "") {
        return value[0];
      }
    } else if (value !== undefined && value !== "") {
      return value;
    }
  }

  return undefined;
};

export const getGeoLookup = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const requestEntityRaw = parseOptionalString(req.query.request_entity);
  if (!requestEntityRaw) {
    throw new ApiError("request_entity is required", 400);
  }

  if (!(requestEntityRaw in ENTITY_CONFIG)) {
    throw new ApiError(
      "request_entity is invalid. Allowed: mp_constituency, mla_constituency, gram_panchayat, village, ward, booth",
      400
    );
  }

  const requestEntity = requestEntityRaw as RequestEntity;
  const entityConfig = ENTITY_CONFIG[requestEntity];

  const { page, limit, offset } = parsePaginationParams(
    req.query.page as string,
    req.query.limit as string,
    25,
    100
  );

  const sortDirection = parseSortDirection(req.query.sort, "ASC");
  const sortColumn = validateSortColumn(req.query.sortColumn, ["id", "dispName"], "dispName");
  const search = parseOptionalString(req.query.search);

  const stateId = parseOptionalPositiveInt(
    getQueryValue(req.query, ["stateId", "state_id"]),
    "stateId"
  );
  const mpConstituencyId = parseOptionalPositiveInt(
    getQueryValue(req.query, ["mpConstituencyId", "mp_constituency_id", "mpcontituencyId"]),
    "mpConstituencyId"
  );
  const mlaConstituencyId = parseOptionalPositiveInt(
    getQueryValue(req.query, ["mlaConstituencyId", "mla_constituency_id", "mlacontituencyId"]),
    "mlaConstituencyId"
  );
  const gramPanchayatId = parseOptionalPositiveInt(
    getQueryValue(req.query, ["gramPanchayatId", "gram_panchayat_id", "grampanchayatId"]),
    "gramPanchayatId"
  );
  const wardNumberId = parseOptionalPositiveInt(
    getQueryValue(req.query, ["wardNumberId", "ward_number_id", "wardnumberid"]),
    "wardNumberId"
  );

  const governingBody = parseOptionalString(
    getQueryValue(req.query, ["governing_body", "governingBody"])
  );
  if (governingBody && !["GBA", "TMC", "CMC", "GP"].includes(governingBody)) {
    throw new ApiError("governing_body must be one of GBA, TMC, CMC, GP", 400);
  }

  const whereClauses: string[] = ["meta.status = 1"];
  const replacements: Record<string, number | string> = {
    limit,
    offset
  };

  if (stateId !== undefined) {
    whereClauses.push("gp.state_id = :stateId");
    replacements.stateId = stateId;
  }
  if (mpConstituencyId !== undefined) {
    whereClauses.push("gp.mp_constituency_id = :mpConstituencyId");
    replacements.mpConstituencyId = mpConstituencyId;
  }
  if (mlaConstituencyId !== undefined) {
    whereClauses.push("gp.mla_constituency_id = :mlaConstituencyId");
    replacements.mlaConstituencyId = mlaConstituencyId;
  }
  if (gramPanchayatId !== undefined) {
    whereClauses.push("gp.gram_panchayat_id = :gramPanchayatId");
    replacements.gramPanchayatId = gramPanchayatId;
  }
  if (wardNumberId !== undefined) {
    whereClauses.push("gp.ward_number_id = :wardNumberId");
    replacements.wardNumberId = wardNumberId;
  }

  if (search) {
    whereClauses.push(`meta.${entityConfig.labelColumn} LIKE :search`);
    replacements.search = `%${search}%`;
  }

  const orderBy = sortColumn === "id" ? "id" : "dispName";

  const baseSelect = `
    SELECT DISTINCT
      meta.id AS id,
      CAST(meta.${entityConfig.labelColumn} AS CHAR(255)) AS dispName
    FROM tbl_geo_political AS gp
    INNER JOIN ${entityConfig.tableName} AS meta
      ON meta.id = gp.${entityConfig.idColumn}
    WHERE ${whereClauses.join(" AND ")}
  `;

  const listQuery = `
    ${baseSelect}
    ORDER BY ${orderBy} ${sortDirection}
    LIMIT :limit OFFSET :offset
  `;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM (
      ${baseSelect}
    ) AS distinct_options
  `;

  const rows = await sequelize.query<{ id: number; dispName: string }>(listQuery, {
    replacements,
    type: QueryTypes.SELECT
  });

  const countRows = await sequelize.query<{ total: number }>(countQuery, {
    replacements,
    type: QueryTypes.SELECT
  });

  const total = Number(countRows[0]?.total ?? 0);
  let responseData = rows;
  let responseTotal = total;

  if (req.query.need_all === "1") {
    responseData = [{ id: -1, dispName: "-ALL-" }, ...rows];
    responseTotal += 1;
  }

  const pagination = calculatePagination(responseTotal, page, limit);

  return sendSuccessWithPagination(res, responseData, pagination, "Geo lookup data retrieved successfully");
});
