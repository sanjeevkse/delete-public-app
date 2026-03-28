import { Op } from "sequelize";

import { ApiError } from "../middlewares/errorHandler";
import GeoPolitical from "../models/GeoPolitical";
import GeoUnitScope from "../models/GeoUnitScope";
import UserAccessScope from "../models/UserAccessScope";
import type { AccessibleArea } from "./userAccessService";
import {
  type AccessScopeType,
  type LocalBodyType,
  type SettlementType,
  parseLocalBodyType,
  parseSettlementType
} from "../types/geo";

type CompiledScope = {
  scopeType: AccessScopeType;
  scopeId: number;
  settlementType: SettlementType | null;
  localBodyType: LocalBodyType | null;
};

export type ResolvedGeoUnitAccess = {
  hasScopeRows: boolean;
  unrestricted: boolean;
  geoUnitIds: number[];
};

const COMMON_FIELDS = [
  "stateId",
  "districtId",
  "mpConstituencyId",
  "mlaConstituencyId",
  "talukId"
] as const;

const URBAN_FIELDS = [
  "localBodyId",
  "wardNumberId",
  "pollingStationId",
  "boothNumberId"
] as const;

const RURAL_FIELDS = [
  "hobaliId",
  "gramPanchayatId",
  "mainVillageId",
  "subVillageId",
  "pollingStationId",
  "boothNumberId"
] as const;

const GENERIC_FIELDS = [
  "localBodyId",
  "hobaliId",
  "gramPanchayatId",
  "mainVillageId",
  "subVillageId",
  "wardNumberId",
  "pollingStationId",
  "boothNumberId"
] as const;

const FIELD_TO_SCOPE_TYPE: Record<string, AccessScopeType> = {
  stateId: "STATE",
  districtId: "DISTRICT",
  mpConstituencyId: "MP_CONSTITUENCY",
  mlaConstituencyId: "MLA_CONSTITUENCY",
  talukId: "TALUK",
  localBodyId: "LOCAL_BODY",
  hobaliId: "HOBALI",
  gramPanchayatId: "GRAM_PANCHAYAT",
  mainVillageId: "MAIN_VILLAGE",
  subVillageId: "SUB_VILLAGE",
  wardNumberId: "WARD",
  pollingStationId: "POLLING_STATION",
  boothNumberId: "BOOTH"
};

const hasPositiveId = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

const hasWildcard = (value: unknown): boolean => value === -1;

const inferBranch = (access: AccessibleArea): SettlementType | null => {
  if (
    access.settlementType === "RURAL" ||
    access.governingBody === "GP" ||
    access.hobaliId !== undefined ||
    access.gramPanchayatId !== undefined ||
    access.mainVillageId !== undefined ||
    access.subVillageId !== undefined
  ) {
    return "RURAL";
  }

  if (
    access.settlementType === "URBAN" ||
    access.governingBody !== undefined ||
    access.localBodyId !== undefined ||
    access.wardNumberId !== undefined
  ) {
    return "URBAN";
  }

  return null;
};

const getRelevantFields = (access: AccessibleArea): readonly string[] => {
  const branch = inferBranch(access);
  if (branch === "RURAL") {
    return [...COMMON_FIELDS, ...RURAL_FIELDS];
  }
  if (branch === "URBAN") {
    return [...COMMON_FIELDS, ...URBAN_FIELDS];
  }

  return [...COMMON_FIELDS, ...GENERIC_FIELDS];
};

const sanitizeNullableInteger = (value: unknown, fieldName: string): number | null | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < -1 || parsed === 0) {
    throw new ApiError(`${fieldName} must be a positive integer or -1`, 400);
  }

  return parsed;
};

const compileAccessScope = (access: AccessibleArea, index: number): CompiledScope => {
  const relevantFields = getRelevantFields(access);
  let deepestFixedField: string | null = null;
  let deepestFixedId: number | null = null;
  let wildcardSeen = false;

  for (const fieldName of relevantFields) {
    const rawValue = access[fieldName as keyof AccessibleArea];
    const value = sanitizeNullableInteger(rawValue, `accessibles[${index}].${fieldName}`);

    if (value === undefined || value === null) {
      continue;
    }

    if (value === -1) {
      wildcardSeen = true;
      continue;
    }

    if (wildcardSeen) {
      throw new ApiError(
        `accessibles[${index}] cannot specify ${fieldName} after a wildcard ancestor`,
        400
      );
    }

    deepestFixedField = fieldName;
    deepestFixedId = value;
  }

  if (wildcardSeen && deepestFixedField === null) {
    return {
      scopeType: "GLOBAL",
      scopeId: 1,
      settlementType: parseSettlementType(access.settlementType) ?? inferBranch(access),
      localBodyType: parseLocalBodyType(access.localBodyType ?? access.governingBody)
    };
  }

  if (!deepestFixedField || !deepestFixedId) {
    throw new ApiError(
      `accessibles[${index}] must include at least one fixed geo level before an optional wildcard`,
      400
    );
  }

  return {
    scopeType: FIELD_TO_SCOPE_TYPE[deepestFixedField],
    scopeId: deepestFixedId,
    settlementType: parseSettlementType(access.settlementType) ?? inferBranch(access),
    localBodyType: parseLocalBodyType(access.localBodyType ?? access.governingBody)
  };
};

export const compileUserAccessScopes = (accessibles: AccessibleArea[]): CompiledScope[] => {
  const dedupe = new Set<string>();
  const compiled: CompiledScope[] = [];

  accessibles.forEach((access, index) => {
    const scope = compileAccessScope(access, index);
    const key = [
      scope.scopeType,
      scope.scopeId,
      scope.settlementType ?? "",
      scope.localBodyType ?? ""
    ].join(":");

    if (!dedupe.has(key)) {
      dedupe.add(key);
      compiled.push(scope);
    }
  });

  return compiled;
};

export const createUserAccessScopes = async (
  userId: number,
  accessRoleId: number,
  accessibles: AccessibleArea[],
  createdBy: number
): Promise<void> => {
  if (accessibles.length === 0) {
    return;
  }

  const compiled = compileUserAccessScopes(accessibles);
  await UserAccessScope.bulkCreate(
    compiled.map((scope) => ({
      userId,
      accessRoleId,
      scopeType: scope.scopeType,
      scopeId: scope.scopeId,
      settlementType: scope.settlementType,
      localBodyType: scope.localBodyType,
      createdBy,
      updatedBy: createdBy,
      status: 1
    }))
  );
};

export const updateUserAccessScopes = async (
  userId: number,
  accessRoleId: number,
  accessibles: AccessibleArea[],
  updatedBy: number
): Promise<void> => {
  await UserAccessScope.update({ status: 0, updatedBy }, { where: { userId } });

  if (accessibles.length === 0) {
    return;
  }

  await createUserAccessScopes(userId, accessRoleId, accessibles, updatedBy);
};

export const getUserAccessScopes = async (userId: number): Promise<UserAccessScope[]> =>
  UserAccessScope.findAll({
    where: { userId, status: 1 },
    include: [{ association: "accessRole" }],
    order: [["id", "ASC"]]
  });

const listGeoUnitIdsForScope = async (
  scope: Pick<CompiledScope, "scopeType" | "scopeId" | "settlementType" | "localBodyType">
): Promise<number[]> => {
  const geoWhere: Record<string, unknown> = {};
  if (scope.settlementType) {
    geoWhere.settlementType = scope.settlementType;
  }
  if (scope.localBodyType) {
    geoWhere.governingBody = scope.localBodyType;
  }

  const rows = await GeoUnitScope.findAll({
    attributes: ["geoUnitId"],
    where: {
      scopeType: scope.scopeType === "GLOBAL" ? { [Op.eq]: "STATE" } : scope.scopeType,
      scopeId: scope.scopeId,
      status: 1
    },
    include: [
      {
        model: GeoPolitical,
        as: "geoUnit",
        attributes: [],
        required: true,
        where: geoWhere
      }
    ],
    raw: true
  });

  return rows
    .map((row) => Number(row.geoUnitId))
    .filter((value) => Number.isInteger(value) && value > 0);
};

export const resolveGeoUnitIdsForAccessibles = async (
  accessibles: AccessibleArea[]
): Promise<ResolvedGeoUnitAccess> => {
  if (accessibles.length === 0) {
    return { hasScopeRows: false, unrestricted: false, geoUnitIds: [] };
  }

  const compiled = compileUserAccessScopes(accessibles);
  if (compiled.some((scope) => scope.scopeType === "GLOBAL")) {
    return { hasScopeRows: true, unrestricted: true, geoUnitIds: [] };
  }

  const ids = new Set<number>();
  for (const scope of compiled) {
    const geoUnitIds = await listGeoUnitIdsForScope(scope);
    geoUnitIds.forEach((id) => ids.add(id));
  }

  return {
    hasScopeRows: true,
    unrestricted: false,
    geoUnitIds: Array.from(ids)
  };
};

export const resolveUserGeoUnitAccess = async (
  userId: number
): Promise<ResolvedGeoUnitAccess> => {
  const scopeRows = await UserAccessScope.findAll({
    where: { userId, status: 1 },
    order: [["id", "ASC"]]
  });

  if (scopeRows.length === 0) {
    return { hasScopeRows: false, unrestricted: false, geoUnitIds: [] };
  }

  if (scopeRows.some((scope) => scope.scopeType === "GLOBAL")) {
    return { hasScopeRows: true, unrestricted: true, geoUnitIds: [] };
  }

  const ids = new Set<number>();
  for (const scope of scopeRows) {
    const geoUnitIds = await listGeoUnitIdsForScope(scope);
    geoUnitIds.forEach((id) => ids.add(id));
  }

  return {
    hasScopeRows: true,
    unrestricted: false,
    geoUnitIds: Array.from(ids)
  };
};
