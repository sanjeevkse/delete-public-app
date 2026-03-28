import { Op } from "sequelize";

import { ApiError } from "../middlewares/errorHandler";
import GeoPolitical from "../models/GeoPolitical";
import { parseLocalBodyType, parseSettlementType } from "../types/geo";
import { resolveUserGeoUnitAccess } from "./userAccessScopeService";

export type GeoResolutionInput = {
  stateId?: number | null;
  districtId?: number | null;
  talukId?: number | null;
  mpConstituencyId?: number | null;
  mlaConstituencyId?: number | null;
  settlementType?: "URBAN" | "RURAL" | null;
  governingBody?: "GBA" | "CC" | "CMC" | "TMC" | "TP" | "GP" | null;
  localBodyId?: number | null;
  hobaliId?: number | null;
  gramPanchayatId?: number | null;
  mainVillageId?: number | null;
  subVillageId?: number | null;
  wardNumberId?: number | null;
  pollingStationId?: number | null;
  boothNumberId?: number | null;
};

export type GeoUnitPayload = {
  geoUnitId: number | null;
  stateId: number | null;
  districtId: number | null;
  talukId: number | null;
  mpConstituencyId: number | null;
  mlaConstituencyId: number | null;
  settlementType: "URBAN" | "RURAL" | null;
  governingBody: "GBA" | "CC" | "CMC" | "TMC" | "TP" | "GP" | null;
  localBodyId: number | null;
  hobaliId: number | null;
  gramPanchayatId: number | null;
  mainVillageId: number | null;
  subVillageId: number | null;
  wardNumberId: number | null;
  pollingStationId: number | null;
  boothNumberId: number | null;
};

const FIELD_ALIASES: Record<keyof GeoResolutionInput, string[]> = {
  stateId: ["stateId", "state_id"],
  districtId: ["districtId", "district_id"],
  talukId: ["talukId", "taluk_id"],
  mpConstituencyId: ["mpConstituencyId", "mp_constituency_id"],
  mlaConstituencyId: ["mlaConstituencyId", "mla_constituency_id"],
  settlementType: ["settlementType", "settlement_type"],
  governingBody: ["governingBody", "governing_body", "localBodyType", "local_body_type"],
  localBodyId: ["localBodyId", "local_body_id"],
  hobaliId: ["hobaliId", "hobali_id"],
  gramPanchayatId: ["gramPanchayatId", "gram_panchayat_id"],
  mainVillageId: ["mainVillageId", "main_village_id", "villageId", "village_id"],
  subVillageId: ["subVillageId", "sub_village_id"],
  wardNumberId: ["wardNumberId", "ward_number_id", "wardId", "ward_id"],
  pollingStationId: ["pollingStationId", "polling_station_id"],
  boothNumberId: ["boothNumberId", "booth_number_id", "boothId", "booth_id"]
};

const INTEGER_FIELDS: Array<keyof GeoResolutionInput> = [
  "stateId",
  "districtId",
  "talukId",
  "mpConstituencyId",
  "mlaConstituencyId",
  "localBodyId",
  "hobaliId",
  "gramPanchayatId",
  "mainVillageId",
  "subVillageId",
  "wardNumberId",
  "pollingStationId",
  "boothNumberId"
];

const getFirstDefined = (source: Record<string, unknown>, aliases: string[]): unknown => {
  for (const alias of aliases) {
    if (Object.prototype.hasOwnProperty.call(source, alias)) {
      return source[alias];
    }
  }
  return undefined;
};

const hasAnyAlias = (source: Record<string, unknown>, aliases: string[]): boolean =>
  aliases.some((alias) => Object.prototype.hasOwnProperty.call(source, alias));

const parseNullablePositiveInteger = (value: unknown, fieldName: string): number | null | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ApiError(`${fieldName} must be a positive integer`, 400);
  }
  return parsed;
};

export const extractGeoResolutionInput = (
  source: Record<string, unknown>
): { touched: boolean; input: GeoResolutionInput } => {
  const input: GeoResolutionInput = {};
  let touched = false;

  for (const fieldName of INTEGER_FIELDS) {
    const aliases = FIELD_ALIASES[fieldName];
    if (!hasAnyAlias(source, aliases)) {
      continue;
    }
    touched = true;
    (input as Record<string, unknown>)[fieldName] = parseNullablePositiveInteger(
      getFirstDefined(source, aliases),
      fieldName
    );
  }

  if (hasAnyAlias(source, FIELD_ALIASES.settlementType)) {
    touched = true;
    const raw = getFirstDefined(source, FIELD_ALIASES.settlementType);
    if (raw === null || raw === "") {
      input.settlementType = null;
    } else {
      const parsed = parseSettlementType(raw);
      if (!parsed) {
        throw new ApiError("settlementType must be one of URBAN or RURAL", 400);
      }
      input.settlementType = parsed;
    }
  }

  if (hasAnyAlias(source, FIELD_ALIASES.governingBody)) {
    touched = true;
    const raw = getFirstDefined(source, FIELD_ALIASES.governingBody);
    if (raw === null || raw === "") {
      input.governingBody = null;
    } else {
      const parsed = parseLocalBodyType(raw);
      if (!parsed) {
        throw new ApiError("governingBody must be one of GBA, CC, CMC, TMC, TP, GP", 400);
      }
      input.governingBody = parsed;
    }
  }

  return { touched, input };
};

const validateGeoResolutionInput = (input: GeoResolutionInput): void => {
  if (input.settlementType === "RURAL" && input.governingBody && input.governingBody !== "GP") {
    throw new ApiError("RURAL geo rows must use governingBody GP", 400);
  }
  if (input.governingBody === "GP" && input.localBodyId) {
    throw new ApiError("localBodyId must not be set when governingBody is GP", 400);
  }
};

export const resolveGeoUnitRecordFromInput = async (
  input: GeoResolutionInput
): Promise<GeoPolitical | null> => {
  validateGeoResolutionInput(input);

  const where: Record<string, unknown> = {};
  for (const [fieldName, value] of Object.entries(input)) {
    if (value !== null && value !== undefined) {
      where[fieldName] = value;
    }
  }

  if (Object.keys(where).length === 0) {
    return null;
  }

  const matches = await GeoPolitical.findAll({
    where,
    limit: 2
  });

  if (matches.length === 1) {
    return matches[0];
  }

  if (matches.length === 0) {
    throw new ApiError(
      "geo fields do not resolve to any geoUnit. Provide a valid leaf selection.",
      400
    );
  }

  throw new ApiError(
    "geo fields resolve to multiple geoUnits. Provide a more specific geo selection.",
    400
  );
};

export const resolveGeoUnitRecordFromSource = async (
  source: Record<string, unknown>
): Promise<GeoPolitical | null | undefined> => {
  const { touched, input } = extractGeoResolutionInput(source);
  if (!touched) {
    return undefined;
  }
  return resolveGeoUnitRecordFromInput(input);
};

export const buildGeoUnitIncludeFilterFromSource = (
  source: Record<string, unknown>
): Record<string, unknown> | null => {
  const { touched, input } = extractGeoResolutionInput(source);
  if (!touched) {
    return null;
  }

  validateGeoResolutionInput(input);

  const where: Record<string, unknown> = {};
  for (const [fieldName, value] of Object.entries(input)) {
    if (value !== null && value !== undefined) {
      where[fieldName] = value;
    }
  }

  return Object.keys(where).length > 0 ? where : null;
};

export const listGeoUnitIdsFromSource = async (
  source: Record<string, unknown>
): Promise<number[]> => {
  const where = buildGeoUnitIncludeFilterFromSource(source);
  if (!where) {
    return [];
  }

  const rows = await GeoPolitical.findAll({
    attributes: ["id"],
    where,
    raw: true
  });

  return rows
    .map((row) => Number(row.id))
    .filter((value) => Number.isInteger(value) && value > 0);
};

export const serializeGeoUnit = (
  geoUnit: Partial<GeoPolitical> | null | undefined,
  fallbackGeoUnitId?: number | null
): GeoUnitPayload | null => {
  if (!geoUnit && !fallbackGeoUnitId) {
    return null;
  }

  return {
    geoUnitId: geoUnit?.id ?? fallbackGeoUnitId ?? null,
    stateId: geoUnit?.stateId ?? null,
    districtId: geoUnit?.districtId ?? null,
    talukId: geoUnit?.talukId ?? null,
    mpConstituencyId: geoUnit?.mpConstituencyId ?? null,
    mlaConstituencyId: geoUnit?.mlaConstituencyId ?? null,
    settlementType: geoUnit?.settlementType ?? null,
    governingBody: geoUnit?.governingBody ?? null,
    localBodyId: geoUnit?.localBodyId ?? null,
    hobaliId: geoUnit?.hobaliId ?? null,
    gramPanchayatId: geoUnit?.gramPanchayatId ?? null,
    mainVillageId: geoUnit?.mainVillageId ?? null,
    subVillageId: geoUnit?.subVillageId ?? null,
    wardNumberId: geoUnit?.wardNumberId ?? null,
    pollingStationId: geoUnit?.pollingStationId ?? null,
    boothNumberId: geoUnit?.boothNumberId ?? null
  };
};

export const assertUserCanAccessGeoUnit = async (
  userId: number,
  geoUnitId: number | null | undefined
): Promise<void> => {
  if (!geoUnitId) {
    return;
  }

  const scopedAccess = await resolveUserGeoUnitAccess(userId);
  if (!scopedAccess.hasScopeRows || scopedAccess.unrestricted) {
    return;
  }

  if (!scopedAccess.geoUnitIds.includes(geoUnitId)) {
    throw new ApiError("Geo selection is outside your accessibility scope", 403);
  }
};

export const buildGeoUnitAccessWhere = async (
  userId: number,
  fieldName: string = "geoUnitId"
): Promise<Record<string, unknown> | null> => {
  const scopedAccess = await resolveUserGeoUnitAccess(userId);
  if (!scopedAccess.hasScopeRows || scopedAccess.unrestricted) {
    return null;
  }

  return {
    [fieldName]: {
      [Op.in]: scopedAccess.geoUnitIds
    }
  };
};
