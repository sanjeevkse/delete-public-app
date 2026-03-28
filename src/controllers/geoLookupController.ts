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
import { parseLocalBodyType, parseSettlementType } from "../types/geo";

type RequestEntity =
  | "district"
  | "mp_constituency"
  | "mla_constituency"
  | "taluk"
  | "local_body"
  | "hobali"
  | "gram_panchayat"
  | "village"
  | "sub_village"
  | "ward"
  | "polling_station"
  | "booth";

interface EntityConfig {
  tableName: string;
  idColumn: string;
  labelColumn: string;
}

const ENTITY_CONFIG: Record<RequestEntity, EntityConfig> = {
  district: {
    tableName: "tbl_meta_district",
    idColumn: "district_id",
    labelColumn: "disp_name"
  },
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
  taluk: {
    tableName: "tbl_meta_taluk",
    idColumn: "taluk_id",
    labelColumn: "disp_name"
  },
  local_body: {
    tableName: "tbl_meta_local_body",
    idColumn: "local_body_id",
    labelColumn: "disp_name"
  },
  hobali: {
    tableName: "tbl_meta_hobali",
    idColumn: "hobali_id",
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
  sub_village: {
    tableName: "tbl_meta_sub_village",
    idColumn: "sub_village_id",
    labelColumn: "disp_name"
  },
  ward: {
    tableName: "tbl_meta_ward_number",
    idColumn: "ward_number_id",
    labelColumn: "disp_name"
  },
  polling_station: {
    tableName: "tbl_meta_polling_station",
    idColumn: "polling_station_id",
    labelColumn: "disp_name"
  },
  booth: {
    tableName: "tbl_meta_booth_number",
    idColumn: "booth_number_id",
    labelColumn: "disp_name"
  }
};

type NumericFilterKey =
  | "stateId"
  | "districtId"
  | "mpConstituencyId"
  | "mlaConstituencyId"
  | "talukId"
  | "localBodyId"
  | "hobaliId"
  | "gramPanchayatId"
  | "mainVillageId"
  | "subVillageId"
  | "wardNumberId"
  | "pollingStationId";

const UPSTREAM_FILTERS: Record<RequestEntity, NumericFilterKey[]> = {
  district: ["stateId"],
  mp_constituency: ["stateId"],
  mla_constituency: ["stateId", "mpConstituencyId"],
  taluk: ["stateId", "districtId", "mpConstituencyId", "mlaConstituencyId"],
  local_body: ["stateId", "districtId", "mpConstituencyId", "mlaConstituencyId", "talukId"],
  hobali: ["stateId", "districtId", "mpConstituencyId", "mlaConstituencyId", "talukId"],
  gram_panchayat: [
    "stateId",
    "districtId",
    "mpConstituencyId",
    "mlaConstituencyId",
    "talukId",
    "hobaliId"
  ],
  village: [
    "stateId",
    "districtId",
    "mpConstituencyId",
    "mlaConstituencyId",
    "talukId",
    "localBodyId",
    "hobaliId",
    "gramPanchayatId",
    "wardNumberId"
  ],
  sub_village: [
    "stateId",
    "districtId",
    "mpConstituencyId",
    "mlaConstituencyId",
    "talukId",
    "hobaliId",
    "gramPanchayatId",
    "mainVillageId"
  ],
  ward: ["stateId", "districtId", "mpConstituencyId", "mlaConstituencyId", "talukId", "localBodyId"],
  polling_station: [
    "stateId",
    "districtId",
    "mpConstituencyId",
    "mlaConstituencyId",
    "talukId",
    "localBodyId",
    "hobaliId",
    "gramPanchayatId",
    "mainVillageId",
    "subVillageId",
    "wardNumberId"
  ],
  booth: [
    "stateId",
    "districtId",
    "mpConstituencyId",
    "mlaConstituencyId",
    "talukId",
    "localBodyId",
    "hobaliId",
    "gramPanchayatId",
    "mainVillageId",
    "subVillageId",
    "wardNumberId",
    "pollingStationId"
  ]
};

const parseOptionalPositiveIntOrAll = (value: unknown, field: string): number | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || (parsed <= 0 && parsed !== -1)) {
    throw new ApiError(`${field} must be a valid positive number or -1 for all`, 400);
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
      "request_entity is invalid. Allowed: district, mp_constituency, mla_constituency, taluk, local_body, hobali, gram_panchayat, village, sub_village, ward, polling_station, booth",
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

  const filters = {
    stateId: parseOptionalPositiveIntOrAll(getQueryValue(req.query, ["stateId", "state_id"]), "stateId"),
    districtId: parseOptionalPositiveIntOrAll(
      getQueryValue(req.query, ["districtId", "district_id"]),
      "districtId"
    ),
    mpConstituencyId: parseOptionalPositiveIntOrAll(
      getQueryValue(req.query, ["mpConstituencyId", "mp_constituency_id", "mpcontituencyId"]),
      "mpConstituencyId"
    ),
    mlaConstituencyId: parseOptionalPositiveIntOrAll(
      getQueryValue(req.query, ["mlaConstituencyId", "mla_constituency_id", "mlacontituencyId"]),
      "mlaConstituencyId"
    ),
    talukId: parseOptionalPositiveIntOrAll(
      getQueryValue(req.query, ["talukId", "taluk_id"]),
      "talukId"
    ),
    localBodyId: parseOptionalPositiveIntOrAll(
      getQueryValue(req.query, ["localBodyId", "local_body_id"]),
      "localBodyId"
    ),
    hobaliId: parseOptionalPositiveIntOrAll(
      getQueryValue(req.query, ["hobaliId", "hobali_id"]),
      "hobaliId"
    ),
    gramPanchayatId: parseOptionalPositiveIntOrAll(
      getQueryValue(req.query, ["gramPanchayatId", "gram_panchayat_id", "grampanchayatId"]),
      "gramPanchayatId"
    ),
    mainVillageId: parseOptionalPositiveIntOrAll(
      getQueryValue(req.query, ["mainVillageId", "main_village_id", "villageId"]),
      "mainVillageId"
    ),
    subVillageId: parseOptionalPositiveIntOrAll(
      getQueryValue(req.query, ["subVillageId", "sub_village_id"]),
      "subVillageId"
    ),
    wardNumberId: parseOptionalPositiveIntOrAll(
      getQueryValue(req.query, ["wardNumberId", "ward_number_id", "wardnumberid"]),
      "wardNumberId"
    ),
    pollingStationId: parseOptionalPositiveIntOrAll(
      getQueryValue(req.query, ["pollingStationId", "polling_station_id"]),
      "pollingStationId"
    )
  };

  const settlementTypeRaw = getQueryValue(req.query, ["settlementType", "settlement_type"]);
  const settlementType = parseSettlementType(settlementTypeRaw);
  if (settlementTypeRaw !== undefined && !settlementType) {
    throw new ApiError("settlementType must be URBAN or RURAL", 400);
  }

  const localBodyTypeRaw = getQueryValue(req.query, [
    "localBodyType",
    "local_body_type",
    "governing_body",
    "governingBody"
  ]);
  const localBodyType = parseLocalBodyType(localBodyTypeRaw);
  if (localBodyTypeRaw !== undefined && !localBodyType) {
    throw new ApiError("localBodyType must be one of GBA, CC, CMC, TMC, TP, GP", 400);
  }

  const shouldReturnOnlyAll = UPSTREAM_FILTERS[requestEntity].some(
    (fieldName) => filters[fieldName] === -1
  );

  if (shouldReturnOnlyAll) {
    const responseData = [{ id: -1, dispName: "-ALL-" }];
    const pagination = calculatePagination(1, page, limit);
    return sendSuccessWithPagination(
      res,
      responseData,
      pagination,
      "Geo lookup data retrieved successfully"
    );
  }

  const whereClauses: string[] = ["meta.status = 1", "gp.status = 1"];
  const replacements: Record<string, number | string> = {
    limit,
    offset
  };

  if (filters.stateId !== undefined) {
    whereClauses.push("gp.state_id = :stateId");
    replacements.stateId = filters.stateId;
  }
  if (filters.districtId !== undefined) {
    whereClauses.push("gp.district_id = :districtId");
    replacements.districtId = filters.districtId;
  }
  if (filters.mpConstituencyId !== undefined) {
    whereClauses.push("gp.mp_constituency_id = :mpConstituencyId");
    replacements.mpConstituencyId = filters.mpConstituencyId;
  }
  if (filters.mlaConstituencyId !== undefined) {
    whereClauses.push("gp.mla_constituency_id = :mlaConstituencyId");
    replacements.mlaConstituencyId = filters.mlaConstituencyId;
  }
  if (filters.talukId !== undefined) {
    whereClauses.push("gp.taluk_id = :talukId");
    replacements.talukId = filters.talukId;
  }
  if (filters.localBodyId !== undefined) {
    whereClauses.push("gp.local_body_id = :localBodyId");
    replacements.localBodyId = filters.localBodyId;
  }
  if (filters.hobaliId !== undefined) {
    whereClauses.push("gp.hobali_id = :hobaliId");
    replacements.hobaliId = filters.hobaliId;
  }
  if (filters.gramPanchayatId !== undefined) {
    whereClauses.push("gp.gram_panchayat_id = :gramPanchayatId");
    replacements.gramPanchayatId = filters.gramPanchayatId;
  }
  if (filters.mainVillageId !== undefined) {
    whereClauses.push("gp.main_village_id = :mainVillageId");
    replacements.mainVillageId = filters.mainVillageId;
  }
  if (filters.subVillageId !== undefined) {
    whereClauses.push("gp.sub_village_id = :subVillageId");
    replacements.subVillageId = filters.subVillageId;
  }
  if (filters.wardNumberId !== undefined) {
    whereClauses.push("gp.ward_number_id = :wardNumberId");
    replacements.wardNumberId = filters.wardNumberId;
  }
  if (filters.pollingStationId !== undefined) {
    whereClauses.push("gp.polling_station_id = :pollingStationId");
    replacements.pollingStationId = filters.pollingStationId;
  }
  if (settlementType) {
    whereClauses.push("gp.settlement_type = :settlementType");
    replacements.settlementType = settlementType;
  }
  if (localBodyType) {
    whereClauses.push("gp.governing_body = :localBodyType");
    replacements.localBodyType = localBodyType;
    if (requestEntity === "local_body") {
      whereClauses.push("meta.body_type = :localBodyType");
    }
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

  return sendSuccessWithPagination(
    res,
    responseData,
    pagination,
    "Geo lookup data retrieved successfully"
  );
});
