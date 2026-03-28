import type { Request, Response } from "express";
import { Op, QueryTypes } from "sequelize";

import { AppEvent, emitEvent } from "../events/eventBus";
import { ADMIN_ROLE_NAME, PUBLIC_ROLE_NAME } from "../config/rbac";
import { ApiError } from "../middlewares/errorHandler";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import sequelize from "../config/database";
import User from "../models/User";
import UserRole from "../models/UserRole";
import UserProfile from "../models/UserProfile";
import UserAccess from "../models/UserAccess";
import MetaEmployment from "../models/MetaEmployment";
import MetaEmploymentStatus from "../models/MetaEmploymentStatus";
import MetaMotherTongue from "../models/MetaMotherTongue";
import MetaResidenceType from "../models/MetaResidenceType";
import MetaFamilyGod from "../models/MetaFamilyGod";
import MetaRationCardType from "../models/MetaRationCardType";
import {
  getRoleByName,
  parseRoleIdsInput,
  resolveRoleIdsOrDefault,
  setUserRoles,
  enrichAdminRolePermissions,
  getRoleIdsByNames
} from "../services/rbacService";
import {
  canManageUser,
  buildUserListingAccessibilityFilter,
  getDescendantRoleIds
} from "../services/userHierarchyService";
import { buildProfileAttributes, resolveProfileGeoUnitId } from "../services/userProfileService";
import {
  createUserAccessProfiles,
  updateUserAccessProfiles,
  validateAccessibles
} from "../services/userAccessService";
import {
  createUserAccessScopes,
  updateUserAccessScopes
} from "../services/userAccessScopeService";
import { createUserWithGeneratedCrfId } from "../services/userCrfIdService";
import asyncHandler from "../utils/asyncHandler";
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
import { normalizePhoneNumber } from "../utils/phoneNumber";
import { assertNoRestrictedFields } from "../utils/payloadValidation";

type QueryRecord = Record<string, unknown>;
type WardBoothCondition = { wardNumberId?: number; boothNumberId?: number };
type ProfileAccessibilityShape = {
  geoUnitId?: number | null;
  wardNumberId?: number | null;
  boothNumberId?: number | null;
};

const isAdminRequester = (user?: AuthenticatedRequest["user"]): boolean => {
  if (!user || !Array.isArray(user.roles)) {
    return false;
  }
  return user.roles.some(
    (role) => typeof role === "string" && role.toLowerCase() === ADMIN_ROLE_NAME.toLowerCase()
  );
};

const firstQueryValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.length > 0 ? value[0] : undefined;
  }
  return value;
};

const getWardBoothConditions = (
  accessibilityFilter: Record<string, unknown>
): WardBoothCondition[] => {
  const conditions = Reflect.get(accessibilityFilter, Op.or) as unknown;
  return Array.isArray(conditions) ? (conditions as WardBoothCondition[]) : [];
};

const getGeoUnitConditionIds = (accessibilityFilter: Record<string, unknown>): number[] => {
  const geoUnitFilter = accessibilityFilter.geoUnitId as Record<symbol, unknown> | undefined;
  const ids = geoUnitFilter ? Reflect.get(geoUnitFilter, Op.in) : undefined;
  return Array.isArray(ids)
    ? ids
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0)
    : [];
};

const profileMatchesAccessibilityFilter = (
  profile: ProfileAccessibilityShape | null | undefined,
  accessibilityFilter: Record<string, unknown> | null
): boolean => {
  if (!accessibilityFilter) {
    return true;
  }

  if (!profile) {
    return false;
  }

  if ("geoUnitId" in accessibilityFilter) {
    const geoUnitIds = getGeoUnitConditionIds(accessibilityFilter);
    return (
      geoUnitIds.length > 0 &&
      typeof profile.geoUnitId === "number" &&
      geoUnitIds.includes(profile.geoUnitId)
    );
  }

  return getWardBoothConditions(accessibilityFilter).some((condition) => {
    const wardMatches =
      condition.wardNumberId === undefined || condition.wardNumberId === profile.wardNumberId;
    const boothMatches =
      condition.boothNumberId === undefined || condition.boothNumberId === profile.boothNumberId;
    return wardMatches && boothMatches;
  });
};

const resolveNestedValue = (source: unknown, segments: string[]): unknown => {
  let current: unknown = source;

  for (const segment of segments) {
    if (current === undefined || current === null) {
      return undefined;
    }

    if (Array.isArray(current)) {
      current = current[0];
    }

    if (typeof current !== "object") {
      return undefined;
    }

    current = (current as QueryRecord)[segment];
  }

  return current;
};

const pickQueryValue = (query: QueryRecord, candidates: string[]): unknown => {
  for (const candidate of candidates) {
    if (Object.prototype.hasOwnProperty.call(query, candidate)) {
      const direct = firstQueryValue(query[candidate]);
      if (direct !== undefined) {
        return direct;
      }
    }

    const nested = resolveNestedValue(query, candidate.split("."));
    const normalized = firstQueryValue(nested);
    if (normalized !== undefined) {
      return normalized;
    }
  }

  return undefined;
};

const parseStringFilter = (value: unknown): string | undefined => {
  const normalized = firstQueryValue(value);
  if (normalized === undefined || normalized === null) {
    return undefined;
  }

  const result = String(normalized).trim();
  return result ? result : undefined;
};

const parseNumberFilter = (value: unknown): number | undefined => {
  const normalized = firstQueryValue(value);
  if (normalized === undefined || normalized === null || normalized === "") {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseBooleanFilter = (value: unknown): boolean | undefined => {
  const normalized = firstQueryValue(value);
  if (normalized === undefined || normalized === null || normalized === "") {
    return undefined;
  }

  if (typeof normalized === "boolean") {
    return normalized;
  }

  if (typeof normalized === "number") {
    if (normalized === 1) {
      return true;
    }
    if (normalized === 0) {
      return false;
    }
  }

  const normalizedStr = String(normalized).trim().toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(normalizedStr)) {
    return true;
  }
  if (["false", "0", "no", "n", "off"].includes(normalizedStr)) {
    return false;
  }
  return undefined;
};

const parseDateFilter = (value: unknown): string | undefined => {
  const normalized = parseStringFilter(value);
  if (!normalized) {
    return undefined;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return normalized;
};

const parseNumberListFilter = (value: unknown): number[] | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const rawValues = Array.isArray(value)
    ? value
    : String(value)
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);

  const numbers = rawValues
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry)) as number[];

  if (numbers.length === 0) {
    return undefined;
  }

  return Array.from(new Set(numbers));
};

const applyRangeFilter = (
  target: Record<string, unknown>,
  field: string,
  start?: string | number,
  end?: string | number
): void => {
  if (start === undefined && end === undefined) {
    return;
  }

  target[field] = {
    ...(start !== undefined ? { [Op.gte]: start } : {}),
    ...(end !== undefined ? { [Op.lte]: end } : {})
  };
};

const USER_PROFILE_INCLUDE = [
  { association: "gender", attributes: ["id", "dispName"], required: false },
  { association: "maritalStatus", attributes: ["id", "dispName"], required: false },
  { association: "residenceType", attributes: ["id", "dispName"], required: false },
  { association: "rationCardType", attributes: ["id", "dispName"], required: false },
  { association: "familyGod", attributes: ["id", "dispName"], required: false },
  { association: "localBody", attributes: ["id", "dispName", "bodyType"], required: false },
  {
    association: "geoUnit",
    attributes: [
      "id",
      "settlementType",
      "governingBody",
      "localBodyId",
      "hobaliId",
      "gramPanchayatId",
      "mainVillageId",
      "subVillageId",
      "wardNumberId",
      "pollingStationId",
      "boothNumberId"
    ],
    required: false
  },
  { association: "wardNumber", attributes: ["id", "dispName"], required: false },
  { association: "boothNumber", attributes: ["id", "dispName"], required: false },
  { association: "educationalDetail", attributes: ["id", "dispName"], required: false },
  { association: "educationalDetailGroup", attributes: ["id", "dispName"], required: false },
  { association: "sector", attributes: ["id", "dispName"], required: false },
  { association: "relationshipType", attributes: ["id", "dispName"], required: false },
  { association: "floor", attributes: ["id", "dispName"], required: false },
  { association: "employmentStatus", attributes: ["id", "dispName"], required: false },
  { association: "disabilityStatus", attributes: ["id", "dispName"], required: false },
  { association: "motherTongue", attributes: ["id", "dispName"], required: false },
  { association: "religion", attributes: ["id", "dispName"], required: false },
  { association: "mainCaste", attributes: ["id", "dispName"], required: false },
  { association: "subCaste", attributes: ["id", "dispName", "categoryId"], required: false },
  { association: "employmentGroup", attributes: ["id", "dispName"], required: false },
  { association: "employment", attributes: ["id", "dispName"], required: false }
];

const USER_ACCESS_PROFILE_INCLUDE = [
  { association: "accessRole" },
  { association: "localBody" },
  { association: "wardNumber" },
  { association: "boothNumber" },
  { association: "mlaConstituency" }
];

const USER_ACCESS_SCOPE_INCLUDE = [{ association: "accessRole" }];

type UserPayloadRecord = Record<string, unknown>;
type GeoEntity = "state" | "mp" | "mla" | "gp" | "village" | "localBody";

const GEO_TABLE_CONFIG: Record<GeoEntity, { tableName: string }> = {
  state: { tableName: "tbl_meta_state" },
  mp: { tableName: "tbl_meta_mp_constituency" },
  mla: { tableName: "tbl_meta_mla_constituency" },
  gp: { tableName: "tbl_meta_gram_panchayat" },
  village: { tableName: "tbl_meta_main_village" },
  localBody: { tableName: "tbl_meta_local_body" }
};

const GOVERNING_BODY_LABELS: Record<"GBA" | "CC" | "CMC" | "TMC" | "TP" | "GP", string> = {
  GBA: "GBA",
  CC: "CC",
  TMC: "TMC",
  CMC: "CMC",
  TP: "TP",
  GP: "GP"
};

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

const parseOptionalPositiveInteger = (value: unknown, fieldName: string): number | null => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ApiError(`${fieldName} must be a positive integer`, 400);
  }

  return parsed;
};

const validateProfileForeignKeys = async (
  profileAttributes: Record<string, unknown>
): Promise<void> => {
  if (Object.prototype.hasOwnProperty.call(profileAttributes, "employmentId")) {
    const employmentStatusId = parseOptionalPositiveInteger(
      profileAttributes.employmentId,
      "profile.employmentStatusId"
    );
    if (employmentStatusId !== null) {
      const employmentStatus = await MetaEmploymentStatus.findByPk(employmentStatusId, {
        attributes: ["id"]
      });
      if (!employmentStatus) {
        throw new ApiError(`Invalid profile.employmentStatusId: ${employmentStatusId}`, 400);
      }
    }
  }

  if (Object.prototype.hasOwnProperty.call(profileAttributes, "employmentTypeId")) {
    const employmentId = parseOptionalPositiveInteger(
      profileAttributes.employmentTypeId,
      "profile.employmentId"
    );
    if (employmentId !== null) {
      const employment = await MetaEmployment.findByPk(employmentId, {
        attributes: ["id"]
      });
      if (!employment) {
        throw new ApiError(`Invalid profile.employmentId: ${employmentId}`, 400);
      }
    }
  }

  if (Object.prototype.hasOwnProperty.call(profileAttributes, "residenceTypeId")) {
    const residenceTypeId = parseOptionalPositiveInteger(
      profileAttributes.residenceTypeId,
      "profile.residenceTypeId"
    );
    if (residenceTypeId !== null) {
      const residenceType = await MetaResidenceType.findByPk(residenceTypeId, {
        attributes: ["id"]
      });
      if (!residenceType) {
        throw new ApiError(`Invalid profile.residenceTypeId: ${residenceTypeId}`, 400);
      }
    }
  }

  if (Object.prototype.hasOwnProperty.call(profileAttributes, "familyGodId")) {
    const familyGodId = parseOptionalPositiveInteger(
      profileAttributes.familyGodId,
      "profile.familyGodId"
    );
    if (familyGodId !== null) {
      const familyGod = await MetaFamilyGod.findByPk(familyGodId, {
        attributes: ["id"]
      });
      if (!familyGod) {
        throw new ApiError(`Invalid profile.familyGodId: ${familyGodId}`, 400);
      }
    }
  }

  if (Object.prototype.hasOwnProperty.call(profileAttributes, "motherTongueId")) {
    const motherTongueId = parseOptionalPositiveInteger(
      profileAttributes.motherTongueId,
      "profile.motherTongueId"
    );
    if (motherTongueId !== null) {
      const motherTongue = await MetaMotherTongue.findByPk(motherTongueId, {
        attributes: ["id"]
      });
      if (!motherTongue) {
        throw new ApiError(`Invalid profile.motherTongueId: ${motherTongueId}`, 400);
      }
    }
  }

  if (Object.prototype.hasOwnProperty.call(profileAttributes, "rationCardTypeId")) {
    const rationCardTypeId = parseOptionalPositiveInteger(
      profileAttributes.rationCardTypeId,
      "profile.rationCardTypeId"
    );
    if (rationCardTypeId !== null) {
      const rationCardType = await MetaRationCardType.findByPk(rationCardTypeId, {
        attributes: ["id"]
      });
      if (!rationCardType) {
        throw new ApiError(`Invalid profile.rationCardTypeId: ${rationCardTypeId}`, 400);
      }
    }
  }
};

const toIdDisplayName = (
  id: unknown,
  displayNameMap: Map<number, string>
): { id: number; displayName: string | null; dispName: string | null } | null => {
  if (!isPositiveInteger(id)) {
    return null;
  }

  const displayName = displayNameMap.get(id) ?? null;
  return {
    id,
    displayName,
    dispName: displayName
  };
};

const toGoverningBodyObject = (
  governingBody: unknown
): { id: string; displayName: string; dispName: string } | null => {
  if (typeof governingBody !== "string") {
    return null;
  }

  const normalized = governingBody.toUpperCase() as keyof typeof GOVERNING_BODY_LABELS;
  const label = GOVERNING_BODY_LABELS[normalized];
  if (!label) {
    return null;
  }

  return {
    id: normalized,
    displayName: label,
    dispName: label
  };
};

const buildGeoLookupMap = async (
  tableName: string,
  ids: number[]
): Promise<Map<number, string>> => {
  const uniqueIds = Array.from(new Set(ids.filter((id) => Number.isInteger(id) && id > 0)));
  if (uniqueIds.length === 0) {
    return new Map<number, string>();
  }

  const rows = await sequelize.query<{ id: number; dispName: string }>(
    `SELECT id, CAST(disp_name AS CHAR(255)) AS dispName
     FROM ${tableName}
     WHERE status = 1 AND id IN (:ids)`,
    {
      replacements: { ids: uniqueIds },
      type: QueryTypes.SELECT
    }
  );

  return new Map(rows.map((row) => [Number(row.id), row.dispName]));
};

const collectGeoIds = (userData: UserPayloadRecord): Record<GeoEntity, number[]> => {
  const ids = {
    state: new Set<number>(),
    mp: new Set<number>(),
    mla: new Set<number>(),
    gp: new Set<number>(),
    village: new Set<number>(),
    localBody: new Set<number>()
  };

  const collectFromRecord = (record: unknown) => {
    if (!record || typeof record !== "object") {
      return;
    }

    const source = record as UserPayloadRecord;
    if (isPositiveInteger(source.stateId)) {
      ids.state.add(source.stateId);
    }
    if (isPositiveInteger(source.mpConstituencyId)) {
      ids.mp.add(source.mpConstituencyId);
    }
    if (isPositiveInteger(source.mlaConstituencyId)) {
      ids.mla.add(source.mlaConstituencyId);
    }
    if (isPositiveInteger(source.gramPanchayatId)) {
      ids.gp.add(source.gramPanchayatId);
    }
    if (isPositiveInteger(source.mainVillageId)) {
      ids.village.add(source.mainVillageId);
    }
    if (isPositiveInteger(source.localBodyId)) {
      ids.localBody.add(source.localBodyId);
    }
  };

  collectFromRecord(userData.profile);

  const accessProfiles = Array.isArray(userData.accessProfiles)
    ? userData.accessProfiles
    : ([] as unknown[]);
  accessProfiles.forEach(collectFromRecord);

  return {
    state: Array.from(ids.state),
    mp: Array.from(ids.mp),
    mla: Array.from(ids.mla),
    gp: Array.from(ids.gp),
    village: Array.from(ids.village),
    localBody: Array.from(ids.localBody)
  };
};

const enrichGeoObjectFields = async (userData: UserPayloadRecord): Promise<UserPayloadRecord> => {
  const ids = collectGeoIds(userData);
  const [stateMap, mpMap, mlaMap, gpMap, villageMap, localBodyMap] = await Promise.all([
    buildGeoLookupMap(GEO_TABLE_CONFIG.state.tableName, ids.state),
    buildGeoLookupMap(GEO_TABLE_CONFIG.mp.tableName, ids.mp),
    buildGeoLookupMap(GEO_TABLE_CONFIG.mla.tableName, ids.mla),
    buildGeoLookupMap(GEO_TABLE_CONFIG.gp.tableName, ids.gp),
    buildGeoLookupMap(GEO_TABLE_CONFIG.village.tableName, ids.village),
    buildGeoLookupMap(GEO_TABLE_CONFIG.localBody.tableName, ids.localBody)
  ]);

  const applyGeoObjects = (record: unknown) => {
    if (!record || typeof record !== "object") {
      return;
    }

    const target = record as UserPayloadRecord;
    target.state = toIdDisplayName(target.stateId, stateMap);
    target.mp = toIdDisplayName(target.mpConstituencyId, mpMap);
    target.mla = toIdDisplayName(target.mlaConstituencyId, mlaMap);
    target.gp = toIdDisplayName(target.gramPanchayatId, gpMap);
    target.village = toIdDisplayName(target.mainVillageId, villageMap);
    target.localBody = toIdDisplayName(target.localBodyId, localBodyMap);
    target.governingBodyObj = toGoverningBodyObject(target.governingBody);
  };

  applyGeoObjects(userData.profile);

  const accessProfiles = Array.isArray(userData.accessProfiles)
    ? userData.accessProfiles
    : ([] as unknown[]);
  accessProfiles.forEach(applyGeoObjects);

  return userData;
};

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const loggedInUser = (req as AuthenticatedRequest).user;
  const { page, limit, offset } = parsePaginationParams(
    req.query.page as string,
    req.query.limit as string,
    25,
    100
  );
  const queryParams = req.query as QueryRecord;
  const search = parseStringFilter(pickQueryValue(queryParams, ["search"])) ?? "";

  const contactNumberFilter = parseStringFilter(
    pickQueryValue(queryParams, ["contactNumber", "contact_number"])
  );
  const userIdFilter = parseNumberFilter(pickQueryValue(queryParams, ["id", "userId", "user_id"]));
  const userEmailFilter = parseStringFilter(pickQueryValue(queryParams, ["email"]));
  const userFullNameFilter = parseStringFilter(
    pickQueryValue(queryParams, ["fullName", "full_name"])
  );
  const userStatusFilters = parseNumberListFilter(queryParams.status);

  const dateOfBirthStart = parseDateFilter(
    pickQueryValue(queryParams, ["dateOfBirthStart", "date_of_birth_start"])
  );
  const dateOfBirthEnd = parseDateFilter(
    pickQueryValue(queryParams, ["dateOfBirthEnd", "date_of_birth_end"])
  );
  const citizenAgeStart = parseNumberFilter(
    pickQueryValue(queryParams, ["citizenAgeStart", "citizen_age_start"])
  );
  const citizenAgeEnd = parseNumberFilter(
    pickQueryValue(queryParams, ["citizenAgeEnd", "citizen_age_end"])
  );
  const genderFilter = parseNumberFilter(pickQueryValue(queryParams, ["genderId", "gender_id"]));
  const maritalStatusFilter = parseNumberFilter(
    pickQueryValue(queryParams, ["maritalStatusId", "marital_status_id"])
  );
  const residenceTypeFilter = parseNumberFilter(
    pickQueryValue(queryParams, ["residenceTypeId", "residence_type_id"])
  );
  const familyGodFilter = parseNumberFilter(
    pickQueryValue(queryParams, ["familyGodId", "family_god_id"])
  );
  const nativePlaceFilter = parseStringFilter(
    pickQueryValue(queryParams, ["nativePlace", "native_place"])
  );
  const relationshipTypeFilter = parseNumberFilter(
    pickQueryValue(queryParams, ["relationshipTypeId", "relationship_type_id"])
  );
  const floorFilter = parseNumberFilter(pickQueryValue(queryParams, ["floorId", "floor_id"]));
  const occupationFilter = parseStringFilter(pickQueryValue(queryParams, ["occupation"]));
  const cityFilter = parseStringFilter(pickQueryValue(queryParams, ["city"]));
  const stateIdFilter = parseNumberFilter(
    pickQueryValue(queryParams, ["stateId", "state_id"])
  );
  const postalCodeFilter = parseStringFilter(
    pickQueryValue(queryParams, ["postalCode", "postal_code"])
  );
  const wardNumberFilter = parseNumberFilter(
    pickQueryValue(queryParams, ["wardNumberId", "ward_number_id"])
  );
  const boothNumberFilter = parseNumberFilter(
    pickQueryValue(queryParams, ["boothNumberId", "booth_number_id"])
  );
  const sectorFilter = parseNumberFilter(pickQueryValue(queryParams, ["sectorId", "sector_id"]));
  const postsBlockedFilter = parseBooleanFilter(
    pickQueryValue(queryParams, ["postsBlocked", "posts_blocked"])
  );
  const referredByFilter = parseStringFilter(
    pickQueryValue(queryParams, ["referredBy", "referred_by"])
  );
  const educationalDetailFilter = parseNumberFilter(
    pickQueryValue(queryParams, ["educationalDetailId", "educational_detail_id"])
  );
  const educationalDetailGroupFilter = parseNumberFilter(
    pickQueryValue(queryParams, ["educationalDetailGroupId", "educational_detail_group_id"])
  );
  const disabilityStatusFilter = parseNumberFilter(
    pickQueryValue(queryParams, ["disabilityStatusId", "disability_status_id"])
  );
  const motherTongueFilter = parseNumberFilter(
    pickQueryValue(queryParams, ["motherTongueId", "mother_tongue_id"])
  );
  const religionFilter = parseNumberFilter(
    pickQueryValue(queryParams, ["religionId", "religion_id"])
  );
  const mainCasteFilter = parseNumberFilter(
    pickQueryValue(queryParams, ["mainCasteId", "main_caste_id"])
  );
  const subCasteFilter = parseNumberFilter(
    pickQueryValue(queryParams, ["subCasteId", "sub_caste_id"])
  );
  const employmentGroupFilter = parseNumberFilter(
    pickQueryValue(queryParams, ["employmentGroupId", "employment_group_id"])
  );
  const employmentFilter = parseNumberFilter(
    pickQueryValue(queryParams, ["employmentId", "employmentTypeId", "employment_type_id"])
  );
  const voterIdNumberFilter = parseStringFilter(
    pickQueryValue(queryParams, ["voterIdNumber", "voter_id_number"])
  );
  const rationCardNoFilter = parseStringFilter(
    pickQueryValue(queryParams, ["rationCardNo", "ration_card_no"])
  );
  const dateOfJoiningStart = parseDateFilter(
    pickQueryValue(queryParams, ["dateOfJoiningStart", "date_of_joining_start"])
  );
  const dateOfJoiningEnd = parseDateFilter(
    pickQueryValue(queryParams, ["dateOfJoiningEnd", "date_of_joining_end"])
  );
  const doorNumberFilter = parseStringFilter(
    pickQueryValue(queryParams, ["doorNumber", "door_number"])
  );
  const serviceConservancyRoadFilter = parseStringFilter(
    pickQueryValue(queryParams, ["serviceConservancyRoad", "service_conservancy_road"])
  );
  const mainRoadFilter = parseStringFilter(pickQueryValue(queryParams, ["mainRoad", "main_road"]));
  const crossRoadFilter = parseStringFilter(
    pickQueryValue(queryParams, ["crossRoad", "cross_road"])
  );
  const locationAreaFilter = parseStringFilter(
    pickQueryValue(queryParams, ["locationArea", "location_area"])
  );
  const landmarkFilter = parseStringFilter(pickQueryValue(queryParams, ["landmark"]));

  // Parse roleId - accepts array format like roleId=[1,2,3]
  let roleIds: number[] | undefined;
  const roleIdInput = req.query.roleId;

  if (roleIdInput) {
    try {
      // Handle array format: roleId=[1,2,3] or roleId=1 or roleId=1&roleId=2
      const parsedIds = parseRoleIdsInput(roleIdInput);
      roleIds = parsedIds ?? undefined;
    } catch (error) {
      // If parsing fails, try single number conversion as fallback
      const singleId = Number(roleIdInput);
      if (!Number.isNaN(singleId) && singleId > 0) {
        roleIds = [singleId];
      }
    }
  }

  const includeAuditFields = shouldIncludeAuditFields(req.query);
  const isReferredByOnlyMode = Boolean(referredByFilter);

  const userFilters: Record<string, unknown> = {};
  if (!isReferredByOnlyMode) {
    if (userIdFilter !== undefined) {
      userFilters.id = userIdFilter;
    }
    if (contactNumberFilter) {
      userFilters.contactNumber = contactNumberFilter;
    }
    if (userEmailFilter) {
      userFilters.email = { [Op.like]: `%${userEmailFilter}%` };
    }
    if (userFullNameFilter) {
      userFilters.fullName = { [Op.like]: `%${userFullNameFilter}%` };
    }
    if (userStatusFilters && userStatusFilters.length > 0) {
      userFilters.status =
        userStatusFilters.length === 1 ? userStatusFilters[0] : { [Op.in]: userStatusFilters };
    }
  }

  const isPendingOnlyFilter =
    Array.isArray(userStatusFilters) && userStatusFilters.length === 1 && userStatusFilters[0] === 2;

  const profileFilters: Record<string, unknown> = {};
  applyRangeFilter(profileFilters, "dateOfBirth", dateOfBirthStart, dateOfBirthEnd);
  applyRangeFilter(profileFilters, "citizenAge", citizenAgeStart, citizenAgeEnd);
  applyRangeFilter(profileFilters, "dateOfJoining", dateOfJoiningStart, dateOfJoiningEnd);

  if (genderFilter !== undefined) {
    profileFilters.genderId = genderFilter;
  }
  if (maritalStatusFilter !== undefined) {
    profileFilters.maritalStatusId = maritalStatusFilter;
  }
  if (residenceTypeFilter !== undefined) {
    profileFilters.residenceTypeId = residenceTypeFilter;
  }
  if (familyGodFilter !== undefined) {
    profileFilters.familyGodId = familyGodFilter;
  }
  if (nativePlaceFilter) {
    profileFilters.nativePlace = { [Op.like]: `%${nativePlaceFilter}%` };
  }
  if (relationshipTypeFilter !== undefined) {
    profileFilters.relationshipTypeId = relationshipTypeFilter;
  }
  if (floorFilter !== undefined) {
    profileFilters.floorId = floorFilter;
  }
  if (occupationFilter) {
    profileFilters.occupation = { [Op.like]: `%${occupationFilter}%` };
  }
  if (cityFilter) {
    profileFilters.city = { [Op.like]: `%${cityFilter}%` };
  }
  if (stateIdFilter !== undefined) {
    profileFilters.stateId = stateIdFilter;
  }
  if (postalCodeFilter) {
    profileFilters.postalCode = { [Op.like]: `%${postalCodeFilter}%` };
  }
  if (wardNumberFilter !== undefined) {
    profileFilters.wardNumberId = wardNumberFilter;
  }
  if (boothNumberFilter !== undefined) {
    profileFilters.boothNumberId = boothNumberFilter;
  }
  if (sectorFilter !== undefined) {
    profileFilters.sectorId = sectorFilter;
  }
  if (postsBlockedFilter !== undefined) {
    profileFilters.postsBlocked = postsBlockedFilter;
  }
  if (referredByFilter) {
    profileFilters.referredBy = { [Op.like]: `%${referredByFilter}%` };
  }
  if (educationalDetailFilter !== undefined) {
    profileFilters.educationalDetailId = educationalDetailFilter;
  }
  if (educationalDetailGroupFilter !== undefined) {
    profileFilters.educationalDetailGroupId = educationalDetailGroupFilter;
  }
  if (disabilityStatusFilter !== undefined) {
    profileFilters.disabilityStatusId = disabilityStatusFilter;
  }
  if (motherTongueFilter !== undefined) {
    profileFilters.motherTongueId = motherTongueFilter;
  }
  if (religionFilter !== undefined) {
    profileFilters.religionId = religionFilter;
  }
  if (mainCasteFilter !== undefined) {
    profileFilters.mainCasteId = mainCasteFilter;
  }
  if (subCasteFilter !== undefined) {
    profileFilters.subCasteId = subCasteFilter;
  }
  if (employmentGroupFilter !== undefined) {
    profileFilters.employmentGroupId = employmentGroupFilter;
  }
  if (employmentFilter !== undefined) {
    profileFilters.employmentTypeId = employmentFilter;
  }
  if (voterIdNumberFilter) {
    profileFilters.voterIdNumber = { [Op.like]: `%${voterIdNumberFilter}%` };
  }
  if (rationCardNoFilter) {
    profileFilters.rationCardNo = { [Op.like]: `%${rationCardNoFilter}%` };
  }
  if (doorNumberFilter) {
    profileFilters.doorNumber = { [Op.like]: `%${doorNumberFilter}%` };
  }
  if (serviceConservancyRoadFilter) {
    profileFilters.serviceConservancyRoad = { [Op.like]: `%${serviceConservancyRoadFilter}%` };
  }
  if (mainRoadFilter) {
    profileFilters.mainRoad = { [Op.like]: `%${mainRoadFilter}%` };
  }
  if (crossRoadFilter) {
    profileFilters.crossRoad = { [Op.like]: `%${crossRoadFilter}%` };
  }
  if (locationAreaFilter) {
    profileFilters.locationArea = { [Op.like]: `%${locationAreaFilter}%` };
  }
  if (landmarkFilter) {
    profileFilters.landmark = { [Op.like]: `%${landmarkFilter}%` };
  }
  if (isReferredByOnlyMode) {
    profileFilters.referredBy = { [Op.like]: `%${referredByFilter}%` };
    for (const key of Object.keys(profileFilters)) {
      if (key !== "referredBy") {
        delete profileFilters[key];
      }
    }
  }

  const profileFiltersApplied = Object.keys(profileFilters).length > 0;

  const whereClauses: Record<string, unknown>[] = [{ status: { [Op.gt]: -1 } }];
  if (Object.keys(userFilters).length > 0) {
    whereClauses.push(userFilters);
  }
  if (search) {
    whereClauses.push({
      [Op.or]: [
        { contactNumber: { [Op.like]: `%${search}%` } },
        { fullName: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ]
    });
  }

  // Apply both role hierarchy and accessibility filters
  let roleHierarchyFilter: { [Op.in]: number[] } | undefined;
  if (loggedInUser?.id && !isReferredByOnlyMode) {
    const roleIds =
      loggedInUser.roleIds && loggedInUser.roleIds.length > 0
        ? loggedInUser.roleIds
        : await getRoleIdsByNames(loggedInUser.roles ?? []);

    if (roleIds.length > 0) {
      // Get all descendant roles for the logged-in user's roles
      const allDescendantRoleIds: Set<number> = new Set();
      for (const roleId of roleIds) {
        const descendantRoles = await getDescendantRoleIds(roleId);
        descendantRoles.forEach((id) => allDescendantRoleIds.add(id));
      }
      // Always include PUBLIC role in listing visibility so public-only users are not excluded.
      const publicRole = await getRoleByName(PUBLIC_ROLE_NAME);
      if (publicRole?.id) {
        allDescendantRoleIds.add(publicRole.id);
      }
      if (allDescendantRoleIds.size > 0) {
        roleHierarchyFilter = { [Op.in]: Array.from(allDescendantRoleIds) };
      }
    }
  }

  const accessibilityFilter =
    loggedInUser?.id && !isReferredByOnlyMode
      ? await buildUserListingAccessibilityFilter(loggedInUser.id)
      : null;

  console.log("listUsers access filter", loggedInUser?.id, accessibilityFilter);

  const userWhere =
    whereClauses.length > 1 ? { [Op.and]: whereClauses } : (whereClauses[0] ?? undefined);
  const profileWhereClauses = [
    profileFiltersApplied ? profileFilters : null,
    accessibilityFilter
  ].filter((value): value is Record<string, unknown> => Boolean(value));
  const profileWhere =
    profileWhereClauses.length === 0
      ? undefined
      : profileWhereClauses.length === 1
        ? profileWhereClauses[0]
        : { [Op.and]: profileWhereClauses };

  const { rows, count } = await User.findAndCountAll({
    where: userWhere,
    attributes: buildQueryAttributes({ includeAuditFields, keepFields: ["createdAt", "status"] }),
    include: [
      {
        model: UserProfile,
        as: "profile",
        ...(profileWhere && { where: profileWhere, required: true }),
        include: USER_PROFILE_INCLUDE
      },
      {
        model: UserAccess,
        as: "accessProfiles",
        where: { status: 1 },
        required: false,
        include: USER_ACCESS_PROFILE_INCLUDE
      },
      {
        association: "accessScopes",
        where: { status: 1 },
        required: false,
        include: USER_ACCESS_SCOPE_INCLUDE
      },
      {
        association: "roles",
        include: [{ association: "permissions" }],
        ...(!isReferredByOnlyMode &&
          !isPendingOnlyFilter &&
          roleHierarchyFilter && {
          where: { id: roleHierarchyFilter },
          required: true
        }),
        ...(!isReferredByOnlyMode &&
          roleIds &&
          roleIds.length > 0 && { where: { id: { [Op.in]: roleIds } }, required: true })
      }
    ],
    limit,
    offset,
    order: [["createdAt", "DESC"]],
    distinct: true
  });

  // Enrich Admin roles with all permissions
  const enrichedRows = await Promise.all(
    rows.map(async (user) => {
      if (user.roles && user.roles.length > 0) {
        const enrichedRoles = await enrichAdminRolePermissions(user.roles);
        return {
          ...user.toJSON(),
          roles: enrichedRoles.reverse()
        };
      }
      return user;
    })
  );

  const pagination = calculatePagination(count, page, limit);

  return sendSuccessWithPagination(res, enrichedRows, pagination, "Users retrieved successfully");
});

export const listUsersPendingApproval = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const loggedInUser = req.user;
    const { page, limit, offset } = parsePaginationParams(
      req.query.page as string,
      req.query.limit as string,
      25,
      100
    );
    const search = (req.query.search as string) ?? "";
    const includeAuditFields = shouldIncludeAuditFields(req.query);

    const whereClause: any = {
      status: 2
    };

    if (search) {
      whereClause[Op.or] = [
        { contactNumber: { [Op.like]: `%${search}%` } },
        { fullName: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    // Apply accessibility filter: only show pending users in accessible zones
    const accessibilityFilter = loggedInUser?.id
      ? await buildUserListingAccessibilityFilter(loggedInUser.id)
      : null;

    const { rows, count } = await User.findAndCountAll({
      where: whereClause,
      attributes: buildQueryAttributes({ includeAuditFields, keepFields: ["createdAt", "status"] }),
      include: [
        {
          model: UserProfile,
          as: "profile",
          ...(accessibilityFilter && { where: accessibilityFilter, required: true }),
          include: USER_PROFILE_INCLUDE
        },
        {
          model: UserAccess,
          as: "accessProfiles",
          where: { status: 1 },
          required: false,
          include: USER_ACCESS_PROFILE_INCLUDE
        },
        {
          association: "accessScopes",
          where: { status: 1 },
          required: false,
          include: USER_ACCESS_SCOPE_INCLUDE
        },
        {
          association: "roles",
          include: [{ association: "permissions" }]
        }
      ],
      limit,
      offset,
      order: [["createdAt", "DESC"]],
      distinct: true
    });

    const enrichedRows = await Promise.all(
      rows.map(async (user) => {
        if (user.roles && user.roles.length > 0) {
          const enrichedRoles = await enrichAdminRolePermissions(user.roles);
          return {
            ...user.toJSON(),
            roles: enrichedRoles.reverse()
          };
        }
        return user;
      })
    );

    const pagination = calculatePagination(count, page, limit);

    return sendSuccessWithPagination(
      res,
      enrichedRows,
      pagination,
      "Users pending approval retrieved successfully"
    );
  }
);

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const loggedInUser = (req as AuthenticatedRequest).user;

  assertNoRestrictedFields(req.body);

  const { contactNumber, email, fullName, profile, roleIds: roleIdsInput, accessibles } = req.body;
  if (!contactNumber) {
    throw new ApiError("contactNumber is required", 400);
  }

  // wardNumberId and boothNumberId can be provided either in profile or in accessible array
  // so we don't require them here - validation happens per context

  const parsedRoleIds = parseRoleIdsInput(roleIdsInput);
  const publicRole = await getRoleByName(PUBLIC_ROLE_NAME);
  if (!publicRole) {
    throw new ApiError("Default public role is not configured", 500);
  }

  // Check if logged-in user can create users with the specified roles
  // Role hierarchy validation removed - roles can be assigned freely
  // Only accessibility boundary is checked in canManageUser

  const user = await createUserWithGeneratedCrfId({
    contactNumber,
    email,
    fullName,
    status: 1
  });

  if (profile) {
    const profileAttributes = buildProfileAttributes(profile);
    if (Object.keys(profileAttributes).length > 0) {
      await validateProfileForeignKeys(profileAttributes as Record<string, unknown>);
      const resolvedGeoUnitId = await resolveProfileGeoUnitId(profileAttributes);
      if (resolvedGeoUnitId !== undefined) {
        profileAttributes.geoUnitId = resolvedGeoUnitId as never;
      }
      // wardNumberId and boothNumberId are optional in profile
      // they can be provided separately in the accessible array
      const profileData: Record<string, unknown> = {
        userId: user.id,
        ...profileAttributes
      };
      await UserProfile.create(profileData as any);
    }
  }

  const combinedRoleIds = Array.from(new Set([...(parsedRoleIds ?? []), publicRole.id]));
  const resolvedRoleIds = await resolveRoleIdsOrDefault(combinedRoleIds);
  await setUserRoles(user.id, resolvedRoleIds);

  // Handle accessibles if provided
  if (accessibles) {
    const validatedAccessibles = validateAccessibles(accessibles);
    const actorId = loggedInUser?.id ?? user.id;
    // Use the first role as access role, or public role if no roles provided
    const accessRoleId = parsedRoleIds?.[0] ?? publicRole.id;
    await createUserAccessProfiles(user.id, accessRoleId, validatedAccessibles, actorId);
    await createUserAccessScopes(user.id, accessRoleId, validatedAccessibles, actorId);
  }

  const actorId = (req as AuthenticatedRequest).user?.id;
  emitEvent(AppEvent.USER_CREATED, { userId: user.id, actorId: actorId ?? user.id });

  const created = await User.findByPk(user.id, {
    include: [
      {
        model: UserProfile,
        as: "profile",
        include: USER_PROFILE_INCLUDE
      },
      {
        model: UserAccess,
        as: "accessProfiles",
        where: { status: 1 },
        required: false,
        include: USER_ACCESS_PROFILE_INCLUDE
      },
      {
        association: "accessScopes",
        where: { status: 1 },
        required: false,
        include: USER_ACCESS_SCOPE_INCLUDE
      },
      { association: "roles", include: [{ association: "permissions" }] }
    ]
  });

  // Enrich Admin roles with all permissions
  if (created && created.roles && created.roles.length > 0) {
    const enrichedRoles = await enrichAdminRolePermissions(created.roles);
    const enrichedUser = {
      ...created.toJSON(),
      roles: enrichedRoles.reverse()
    };
    return sendCreated(res, enrichedUser, "User created successfully");
  }

  return sendCreated(res, created, "User created successfully");
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const loggedInUser = (req as AuthenticatedRequest).user;
  const targetUserId = Number(req.params.id);
  const includeAuditFields = shouldIncludeAuditFields(req.query);

  // Fetch target user with roles and accessibility
  const user = await User.findByPk(targetUserId, {
    attributes: buildQueryAttributes({ includeAuditFields, keepFields: ["status"] }),
    include: [
      {
        model: UserProfile,
        as: "profile",
        include: USER_PROFILE_INCLUDE
      },
      {
        model: UserAccess,
        as: "accessProfiles",
        where: { status: 1 },
        required: false,
        separate: true,
        include: USER_ACCESS_PROFILE_INCLUDE
      },
      {
        association: "accessScopes",
        where: { status: 1 },
        required: false,
        separate: true,
        include: USER_ACCESS_SCOPE_INCLUDE
      },
      { association: "roles", include: [{ association: "permissions" }] }
    ]
  });

  if (!user) {
    return sendNotFound(res, "User not found", "user");
  }

  // Check if logged-in user can access this user (hierarchy and accessibility)
  if (
    loggedInUser?.id &&
    loggedInUser.id !== targetUserId &&
    loggedInUser.roles &&
    !isAdminRequester(loggedInUser)
  ) {
    const userRoles = await UserRole.findAll({
      where: { userId: loggedInUser.id },
      attributes: ["roleId"],
      raw: true
    });
    const loggedInUserRoleIds = userRoles.map((r: any) => r.roleId);
    const targetUserRoles = user.roles?.map((r: any) => r.id) || [];

    let canAccess = false;
    if (user.status === 2) {
      const accessibilityFilter = await buildUserListingAccessibilityFilter(loggedInUser.id);
      canAccess = profileMatchesAccessibilityFilter(user.profile as ProfileAccessibilityShape | null, accessibilityFilter);
    } else {
      canAccess = await canManageUser(
        loggedInUser.id,
        loggedInUserRoleIds,
        targetUserId,
        targetUserRoles
      );
    }

    if (!canAccess) {
      return sendNotFound(res, "User not found or access denied", "user");
    }
  }

  // Enrich Admin roles with all permissions
  const userPayload = await enrichGeoObjectFields(user.toJSON() as UserPayloadRecord);

  if (user.roles && user.roles.length > 0) {
    const enrichedRoles = await enrichAdminRolePermissions(user.roles);
    const enrichedUser = {
      ...userPayload,
      roles: enrichedRoles.reverse()
    };
    return sendSuccess(res, enrichedUser, "User retrieved successfully");
  }

  return sendSuccess(res, userPayload, "User retrieved successfully");
});

export const getUserByMobileNumber = asyncHandler(async (req: Request, res: Response) => {
  const loggedInUser = (req as AuthenticatedRequest).user;
  const includeAuditFields = shouldIncludeAuditFields(req.query);
  const contactNumberInput = req.params.contactNumber ?? req.query.contactNumber;
  const contactNumber = normalizePhoneNumber(contactNumberInput, "contactNumber");

  const user = await User.findOne({
    where: { contactNumber },
    attributes: buildQueryAttributes({ includeAuditFields, keepFields: ["status"] }),
    include: [
      {
        model: UserProfile,
        as: "profile",
        include: USER_PROFILE_INCLUDE
      },
      {
        model: UserAccess,
        as: "accessProfiles",
        where: { status: 1 },
        required: false,
        separate: true,
        include: USER_ACCESS_PROFILE_INCLUDE
      },
      {
        association: "accessScopes",
        where: { status: 1 },
        required: false,
        separate: true,
        include: USER_ACCESS_SCOPE_INCLUDE
      },
      { association: "roles" }
    ]
  });

  if (!user) {
    return sendNotFound(res, "User not found", "user");
  }

  const targetUserId = user.id;
  if (
    loggedInUser?.id &&
    loggedInUser.id !== targetUserId &&
    loggedInUser.roles &&
    !isAdminRequester(loggedInUser)
  ) {
    const userRoles = await UserRole.findAll({
      where: { userId: loggedInUser.id },
      attributes: ["roleId"],
      raw: true
    });
    const loggedInUserRoleIds = userRoles.map((r: any) => r.roleId);
    const targetUserRoles = user.roles?.map((r: any) => r.id) || [];
    let canAccess = false;

    if (user.status === 2) {
      const accessibilityFilter = await buildUserListingAccessibilityFilter(loggedInUser.id);
      canAccess = profileMatchesAccessibilityFilter(user.profile as ProfileAccessibilityShape | null, accessibilityFilter);
    } else {
      canAccess = await canManageUser(
        loggedInUser.id,
        loggedInUserRoleIds,
        targetUserId,
        targetUserRoles
      );
    }

    if (!canAccess) {
      return sendNotFound(res, "User not found or access denied", "user");
    }
  }

  const userPayload = await enrichGeoObjectFields(user.toJSON() as UserPayloadRecord);

  if (Array.isArray(userPayload.roles)) {
    userPayload.roles = [...userPayload.roles].reverse();
  }

  return sendSuccess(res, userPayload, "User retrieved successfully");
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const loggedInUser = (req as AuthenticatedRequest).user;
  const targetUserId = Number(req.params.id);

  const user = await User.findByPk(targetUserId, {
    include: [
      { model: UserProfile, as: "profile" },
      { association: "roles", include: [{ association: "permissions" }] }
    ]
  });

  if (!user) {
    throw new ApiError("User not found", 404);
  }

  // Check if logged-in user can update this user (hierarchy and accessibility)
  if (
    loggedInUser?.id &&
    loggedInUser.id !== targetUserId &&
    loggedInUser.roles &&
    !isAdminRequester(loggedInUser)
  ) {
    const userRoles = await UserRole.findAll({
      where: { userId: loggedInUser.id },
      attributes: ["roleId"],
      raw: true
    });
    const loggedInUserRoleIds = userRoles.map((r: any) => r.roleId);
    const targetUserRoles = user.roles?.map((r: any) => r.id) || [];
    let canAccess = false;

    if (user.status === 2) {
      const accessibilityFilter = await buildUserListingAccessibilityFilter(loggedInUser.id);
      canAccess = profileMatchesAccessibilityFilter(user.profile as ProfileAccessibilityShape | null, accessibilityFilter);
    } else {
      canAccess = await canManageUser(
        loggedInUser.id,
        loggedInUserRoleIds,
        targetUserId,
        targetUserRoles
      );
    }

    if (!canAccess) {
      throw new ApiError("Access denied: Cannot update this user", 403);
    }
  }

  assertNoRestrictedFields(req.body, { allow: ["status"] });

  const {
    profile,
    roleIds: roleIdsInput,
    accessibles,
    status: statusUpdate,
    ...userUpdates
  } = req.body;

  let profileInput: Record<string, unknown> | undefined;
  if (profile !== undefined) {
    if (profile === null || profile === "") {
      profileInput = {};
    } else if (typeof profile === "object" && !Array.isArray(profile)) {
      profileInput = profile as Record<string, unknown>;
    } else if (typeof profile === "string") {
      try {
        const parsed = JSON.parse(profile);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new ApiError("profile must be a JSON object", 400);
        }
        profileInput = parsed as Record<string, unknown>;
      } catch (error) {
        throw new ApiError("profile must be a valid JSON object", 400);
      }
    } else {
      throw new ApiError("profile must be an object", 400);
    }
  }

  // Validate and handle status if provided (0=inactive, 1=active/approved, 2=pending approval)
  if (statusUpdate !== undefined && statusUpdate !== null) {
    const parsedStatus = Number(statusUpdate);
    if (!Number.isInteger(parsedStatus) || ![0, 1, 2].includes(parsedStatus)) {
      throw new ApiError("status must be 0, 1, or 2", 400);
    }
    userUpdates.status = parsedStatus;
  }

  const parsedRoleIds = parseRoleIdsInput(roleIdsInput);

  await user.update(userUpdates);

  if (profileInput !== undefined) {
    const profileAttributes = buildProfileAttributes(profileInput, user.profile ?? undefined);
    if (Object.keys(profileAttributes).length > 0) {
      await validateProfileForeignKeys(profileAttributes as Record<string, unknown>);
      const resolvedGeoUnitId = await resolveProfileGeoUnitId(
        profileAttributes,
        user.profile ?? undefined
      );
      if (resolvedGeoUnitId !== undefined) {
        profileAttributes.geoUnitId = resolvedGeoUnitId as never;
      }
      if (user.profile) {
        await user.profile.update(profileAttributes);
      } else {
        await UserProfile.create({
          userId: user.id,
          ...profileAttributes
        });
      }
    }
  }

  if (roleIdsInput !== undefined) {
    const resolvedRoleIds = await resolveRoleIdsOrDefault(parsedRoleIds);
    await setUserRoles(user.id, resolvedRoleIds);
  }

  // Handle accessibles update if provided
  if (accessibles !== undefined) {
    const validatedAccessibles = validateAccessibles(accessibles);
    const actorId = (req as AuthenticatedRequest).user?.id ?? user.id;
    // Use the first role as access role, or get from existing roles
    const accessRoleId =
      parsedRoleIds?.[0] ?? user.roles?.[0]?.id ?? (await getRoleByName(PUBLIC_ROLE_NAME))?.id;
    if (!accessRoleId) {
      throw new ApiError("Cannot determine access role for user", 500);
    }
    await updateUserAccessProfiles(user.id, accessRoleId, validatedAccessibles, actorId);
    await updateUserAccessScopes(user.id, accessRoleId, validatedAccessibles, actorId);
  }

  const actorId = (req as AuthenticatedRequest).user?.id;
  emitEvent(AppEvent.USER_UPDATED, { userId: user.id, actorId: actorId ?? user.id });

  const updated = await User.findByPk(user.id, {
    include: [
      {
        model: UserProfile,
        as: "profile",
        include: USER_PROFILE_INCLUDE
      },
      {
        model: UserAccess,
        as: "accessProfiles",
        where: { status: 1 },
        required: false,
        include: USER_ACCESS_PROFILE_INCLUDE
      },
      {
        association: "accessScopes",
        where: { status: 1 },
        required: false,
        include: USER_ACCESS_SCOPE_INCLUDE
      },
      { association: "roles", include: [{ association: "permissions" }] }
    ]
  });

  // Enrich Admin roles with all permissions
  if (updated && updated.roles && updated.roles.length > 0) {
    const enrichedRoles = await enrichAdminRolePermissions(updated.roles);
    const enrichedUser = {
      ...updated.toJSON(),
      roles: enrichedRoles.reverse()
    };
    return sendSuccess(res, enrichedUser, "User updated successfully");
  }

  return sendSuccess(res, updated, "User updated successfully");
});

export const updateUserStatus = asyncHandler(async (req: Request, res: Response) => {
  const loggedInUser = (req as AuthenticatedRequest).user;
  const targetUserId = Number(req.params.id);
  const user = await User.findByPk(req.params.id, {
    include: [{ model: UserProfile, as: "profile" }, { association: "roles" }]
  });

  if (!user) {
    throw new ApiError("User not found", 404);
  }

  if (
    loggedInUser?.id &&
    loggedInUser.id !== targetUserId &&
    loggedInUser.roles &&
    !isAdminRequester(loggedInUser)
  ) {
    const userRoles = await UserRole.findAll({
      where: { userId: loggedInUser.id },
      attributes: ["roleId"],
      raw: true
    });
    const loggedInUserRoleIds = userRoles.map((r: any) => r.roleId);
    const targetUserRoles = user.roles?.map((r: any) => r.id) || [];
    let canAccess = false;

    if (user.status === 2) {
      const accessibilityFilter = await buildUserListingAccessibilityFilter(loggedInUser.id);
      canAccess = profileMatchesAccessibilityFilter(user.profile as ProfileAccessibilityShape | null, accessibilityFilter);
    } else {
      canAccess = await canManageUser(
        loggedInUser.id,
        loggedInUserRoleIds,
        targetUserId,
        targetUserRoles
      );
    }

    if (!canAccess) {
      throw new ApiError("Access denied: Cannot update this user status", 403);
    }
  }

  const action = typeof req.body?.action === "string" ? req.body.action.toLowerCase() : "";

  if (action !== "activate" && action !== "deactivate") {
    throw new ApiError("Invalid action. Allowed values are 'activate' or 'deactivate'.", 400);
  }

  const targetStatus = action === "activate" ? 1 : 0;

  if (user.status === targetStatus) {
    const hydrated = await User.findByPk(user.id, {
      include: [
        {
          model: UserProfile,
          as: "profile",
          include: USER_PROFILE_INCLUDE
        },
        { association: "roles", include: [{ association: "permissions" }] },
        {
          model: UserAccess,
          as: "accessProfiles",
          where: { status: 1 },
          required: false,
          include: USER_ACCESS_PROFILE_INCLUDE
        },
        {
          association: "accessScopes",
          where: { status: 1 },
          required: false,
          include: USER_ACCESS_SCOPE_INCLUDE
        }
      ]
    });

    const message =
      targetStatus === 1 ? "User is already active" : "User is already inactive/deactivated";

    // Enrich Admin roles with all permissions
    if (hydrated && hydrated.roles && hydrated.roles.length > 0) {
      const enrichedRoles = await enrichAdminRolePermissions(hydrated.roles);
      const enrichedUser = {
        ...hydrated.toJSON(),
        roles: enrichedRoles.reverse()
      };
      return sendSuccess(res, enrichedUser, message);
    }

    return sendSuccess(res, hydrated, message);
  }

  const actorId = (req as AuthenticatedRequest).user?.id ?? null;
  await user.update({ status: targetStatus, updatedBy: actorId });
  emitEvent(AppEvent.USER_UPDATED, { userId: user.id, actorId: actorId ?? user.id });

  const updated = await User.findByPk(user.id, {
    include: [
      {
        model: UserProfile,
        as: "profile",
        include: USER_PROFILE_INCLUDE
      },
      { association: "roles", include: [{ association: "permissions" }] },
      {
        model: UserAccess,
        as: "accessProfiles",
        where: { status: 1 },
        required: false,
        include: USER_ACCESS_PROFILE_INCLUDE
      },
      {
        association: "accessScopes",
        where: { status: 1 },
        required: false,
        include: USER_ACCESS_SCOPE_INCLUDE
      }
    ]
  });

  const message =
    targetStatus === 1 ? "User activated successfully" : "User deactivated successfully";

  // Enrich Admin roles with all permissions
  if (updated && updated.roles && updated.roles.length > 0) {
    const enrichedRoles = await enrichAdminRolePermissions(updated.roles);
    const enrichedUser = {
      ...updated.toJSON(),
      roles: enrichedRoles.reverse()
    };
    return sendSuccess(res, enrichedUser, message);
  }

  return sendSuccess(res, updated, message);
});

export const updateUserPostsBlockStatus = asyncHandler(async (req: Request, res: Response) => {
  const loggedInUser = (req as AuthenticatedRequest).user;
  const targetUserId = Number(req.params.id);
  const user = await User.findByPk(req.params.id, {
    include: [{ model: UserProfile, as: "profile" }, { association: "roles" }]
  });

  if (!user) {
    throw new ApiError("User not found", 404);
  }

  if (
    loggedInUser?.id &&
    loggedInUser.id !== targetUserId &&
    loggedInUser.roles &&
    !isAdminRequester(loggedInUser)
  ) {
    const userRoles = await UserRole.findAll({
      where: { userId: loggedInUser.id },
      attributes: ["roleId"],
      raw: true
    });
    const loggedInUserRoleIds = userRoles.map((r: any) => r.roleId);
    const targetUserRoles = user.roles?.map((r: any) => r.id) || [];
    let canAccess = false;

    if (user.status === 2) {
      const accessibilityFilter = await buildUserListingAccessibilityFilter(loggedInUser.id);
      canAccess = profileMatchesAccessibilityFilter(user.profile as ProfileAccessibilityShape | null, accessibilityFilter);
    } else {
      canAccess = await canManageUser(
        loggedInUser.id,
        loggedInUserRoleIds,
        targetUserId,
        targetUserRoles
      );
    }

    if (!canAccess) {
      throw new ApiError("Access denied: Cannot update posts block status for this user", 403);
    }
  }

  const action = typeof req.body?.action === "string" ? req.body.action.toLowerCase() : "";
  if (action !== "block" && action !== "unblock") {
    throw new ApiError("Invalid action. Allowed values are 'block' or 'unblock'.", 400);
  }

  const shouldBlock = action === "block";
  const actorId = (req as AuthenticatedRequest).user?.id ?? null;

  const fetchUserDetails = () =>
    User.findByPk(user.id, {
      include: [
        {
          model: UserProfile,
          as: "profile",
          include: USER_PROFILE_INCLUDE
        },
        { association: "roles", include: [{ association: "permissions" }] },
        {
          model: UserAccess,
          as: "accessProfiles",
          where: { status: 1 },
          required: false,
          include: USER_ACCESS_PROFILE_INCLUDE
        },
        {
          association: "accessScopes",
          where: { status: 1 },
          required: false,
          include: USER_ACCESS_SCOPE_INCLUDE
        }
      ]
    });

  if (!user.profile) {
    if (!shouldBlock) {
      const hydrated = await fetchUserDetails();
      return sendSuccess(res, hydrated, "User posts are already unblocked");
    }

    const profileAttributes = buildProfileAttributes(req.body);
    const resolvedGeoUnitId = await resolveProfileGeoUnitId(profileAttributes);

    if (!resolvedGeoUnitId) {
      throw new ApiError(
        "Geo fields that resolve to a valid geoUnit are required to create user profile",
        400
      );
    }

    await UserProfile.create({
      userId: user.id,
      ...profileAttributes,
      geoUnitId: resolvedGeoUnitId,
      postsBlocked: true,
      createdBy: actorId,
      updatedBy: actorId
    });
  } else {
    if (user.profile.postsBlocked === shouldBlock) {
      const hydrated = await fetchUserDetails();
      const message = shouldBlock
        ? "User posts are already blocked"
        : "User posts are already unblocked";
      return sendSuccess(res, hydrated, message);
    }

    await user.profile.update({
      postsBlocked: shouldBlock,
      updatedBy: actorId
    });
  }

  const updated = await fetchUserDetails();
  const message = shouldBlock
    ? "User posts blocked successfully"
    : "User posts unblocked successfully";

  // Reverse roles array
  if (updated && updated.roles && updated.roles.length > 0) {
    const enrichedRoles = await enrichAdminRolePermissions(updated.roles);
    const enrichedUser = {
      ...updated.toJSON(),
      roles: enrichedRoles.reverse()
    };
    return sendSuccess(res, enrichedUser, message);
  }

  return sendSuccess(res, updated, message);
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const loggedInUser = (req as AuthenticatedRequest).user;
  const targetUserId = Number(req.params.id);
  const user = await User.findByPk(req.params.id, {
    include: [{ model: UserProfile, as: "profile" }, { association: "roles" }]
  });

  if (!user) {
    return sendNotFound(res, "User not found", "user");
  }

  if (
    loggedInUser?.id &&
    loggedInUser.id !== targetUserId &&
    loggedInUser.roles &&
    !isAdminRequester(loggedInUser)
  ) {
    const userRoles = await UserRole.findAll({
      where: { userId: loggedInUser.id },
      attributes: ["roleId"],
      raw: true
    });
    const loggedInUserRoleIds = userRoles.map((r: any) => r.roleId);
    const targetUserRoles = user.roles?.map((r: any) => r.id) || [];

    let canAccess = false;
    if (user.status === 2) {
      const accessibilityFilter = await buildUserListingAccessibilityFilter(loggedInUser.id);
      canAccess = profileMatchesAccessibilityFilter(user.profile as ProfileAccessibilityShape | null, accessibilityFilter);
    } else {
      canAccess = await canManageUser(
        loggedInUser.id,
        loggedInUserRoleIds,
        targetUserId,
        targetUserRoles
      );
    }

    if (!canAccess) {
      throw new ApiError("Access denied: Cannot delete this user", 403);
    }
  }

  const actorId = (req as AuthenticatedRequest).user?.id ?? null;
  await user.update({ status: -1, updatedBy: actorId });

  return sendNoContent(res);
});
