import type { CreationAttributes } from "sequelize";

import { ApiError } from "../middlewares/errorHandler";
import GeoPolitical from "../models/GeoPolitical";
import type UserProfile from "../models/UserProfile";
import { parseLocalBodyType, parseSettlementType } from "../types/geo";

type ProfileInput = Record<string, unknown> | undefined | null;

const DIRECT_PROFILE_FIELDS: Array<keyof CreationAttributes<UserProfile>> = [
  "displayName",
  "alernativeContactNumber",
  "emergencyContactNumber",
  "aadhaarNumber",
  "panNumber",
  "bio",
  "dateOfBirth",
  "citizenAge",
  "genderId",
  "educationalDetailId",
  "educationalDetailGroupId",
  "dateOfJoining",
  "maritalStatusId",
  "disabilityStatusId",
  "motherTongueId",
  "religionId",
  "mainCasteId",
  "subCasteId",
  "voterIdNumber",
  "voterIdPhoto",
  "aadhaarPhoto",
  "rationCardNo",
  "rationCardPhoto",
  "rationCardTypeId",
  "employmentGroupId",
  "relationshipTypeId",
  "relationshipName",
  "residenceTypeId",
  "nativePlace",
  "nativeLat",
  "nativeLong",
  "isVoter",
  "familyGodId",
  "doorNumber",
  "floorId",
  "serviceConservancyRoad",
  "mainRoad",
  "crossRoad",
  "locationArea",
  "landmark",
  "occupation",
  "profileImageUrl",
  "referredBy",
  "fullAddress",
  "addressLine1",
  "addressLine2",
  "city",
  "postalCode",
  "country",
  "stateId",
  "districtId",
  "talukId",
  "mpConstituencyId",
  "mlaConstituencyId",
  "settlementType",
  "governingBody",
  "localBodyId",
  "hobaliId",
  "gramPanchayatId",
  "mainVillageId",
  "subVillageId",
  "voterListBoothNo",
  "voterListSlNo",
  "mapBoothNo",
  "mapSlNo",
  "mapSubSlNo",
  "wardNumberId",
  "pollingStationId",
  "boothNumberId",
  "sectorId",
  "isRegistrationAgreed",
  "latitude",
  "longitude",
  "socialLinksJson",
  "preferencesJson",
  "postsBlocked",
  "status"
];

const PROFILE_GEO_INTEGER_FIELDS = [
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
] as const;

const PROFILE_GEO_RESOLUTION_FIELDS = [
  "stateId",
  "districtId",
  "talukId",
  "mpConstituencyId",
  "mlaConstituencyId",
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
] as const;

export const buildProfileAttributes = (
  input: ProfileInput,
  existingProfile?: UserProfile | null
): Partial<CreationAttributes<UserProfile>> => {
  if (!input || typeof input !== "object") {
    return {};
  }

  const payload: Partial<CreationAttributes<UserProfile>> = {};
  const asRecord = input as Record<string, unknown>;
  const hasPayloadField = (field: keyof CreationAttributes<UserProfile>): boolean =>
    Object.prototype.hasOwnProperty.call(payload, field);
  const getPayloadOrExisting = <T>(
    field: keyof CreationAttributes<UserProfile>,
    existingValue: T | null | undefined
  ): T | null =>
    hasPayloadField(field) ? ((payload[field] as T | null | undefined) ?? null) : (existingValue ?? null);

  if ("geoUnitId" in asRecord || "geo_unit_id" in asRecord) {
    throw new ApiError("profile.geoUnitId is managed by backend", 400);
  }

  DIRECT_PROFILE_FIELDS.forEach((field) => {
    if (field in asRecord) {
      payload[field] = asRecord[field] as never;
    }
  });

  if (!payload.alernativeContactNumber) {
    const alternateContact =
      (asRecord["alternateMobileNumber"] as string | undefined) ??
      (asRecord["alternateContactNumber"] as string | undefined) ??
      (asRecord["alernativeContactNumber"] as string | undefined);
    if (alternateContact) {
      payload.alernativeContactNumber = alternateContact as never;
    }
  }

  const normalizeAliasValue = (value: unknown): string => {
    if (value === null || value === "") {
      return "null";
    }
    return String(value);
  };

  const resolveAliasValue = (
    logicalField: string,
    aliases: Array<{ key: string; value: unknown }>
  ): unknown => {
    const provided = aliases.filter(({ value }) => value !== undefined);
    if (provided.length === 0) {
      return undefined;
    }

    const uniqueNormalizedValues = new Set(provided.map(({ value }) => normalizeAliasValue(value)));
    if (uniqueNormalizedValues.size > 1) {
      const keys = provided.map(({ key }) => key).join(", ");
      throw new ApiError(`${logicalField} has conflicting values in: ${keys}`, 400);
    }

    return provided[0].value;
  };

  // employmentStatusId -> tbl_user_profile.employment_id -> tbl_meta_employment_status
  const resolvedEmploymentStatusId = resolveAliasValue("employmentStatusId", [
    { key: "employmentStatusId", value: asRecord["employmentStatusId"] },
    { key: "employmentTypeId", value: asRecord["employmentTypeId"] },
    { key: "employment_type_id", value: asRecord["employment_type_id"] },
    { key: "employment_status_id", value: asRecord["employment_status_id"] },
    { key: "employment_id", value: asRecord["employment_id"] }
  ]);
  if (resolvedEmploymentStatusId !== undefined) {
    payload.employmentId = resolvedEmploymentStatusId as never;
  }

  // employmentId -> tbl_user_profile.employment_type_id -> tbl_meta_employment
  const resolvedEmploymentId = resolveAliasValue("employmentId", [
    { key: "employmentId", value: asRecord["employmentId"] }
  ]);
  if (resolvedEmploymentId !== undefined) {
    payload.employmentTypeId = resolvedEmploymentId as never;
  }

  const resolvedNativeLat = resolveAliasValue("nativeLat", [
    { key: "nativeLat", value: asRecord["nativeLat"] },
    { key: "native_lat", value: asRecord["native_lat"] }
  ]);
  if (resolvedNativeLat !== undefined) {
    payload.nativeLat = resolvedNativeLat as never;
  }

  const resolvedNativeLong = resolveAliasValue("nativeLong", [
    { key: "nativeLong", value: asRecord["nativeLong"] },
    { key: "native_long", value: asRecord["native_long"] }
  ]);
  if (resolvedNativeLong !== undefined) {
    payload.nativeLong = resolvedNativeLong as never;
  }

  const resolvedRationCardTypeId = resolveAliasValue("rationCardTypeId", [
    { key: "rationCardTypeId", value: asRecord["rationCardTypeId"] },
    { key: "ration_card_type_id", value: asRecord["ration_card_type_id"] }
  ]);
  if (resolvedRationCardTypeId !== undefined) {
    payload.rationCardTypeId = resolvedRationCardTypeId as never;
  }

  const resolvedIsVoter = resolveAliasValue("isVoter", [
    { key: "isVoter", value: asRecord["isVoter"] },
    { key: "is_voter", value: asRecord["is_voter"] }
  ]);
  if (resolvedIsVoter !== undefined) {
    payload.isVoter = resolvedIsVoter as never;
  }

  const socialLinks: Record<string, unknown> = existingProfile?.socialLinksJson
    ? { ...existingProfile.socialLinksJson }
    : {};
  let socialLinksChanged = false;

  if ("instagramId" in asRecord) {
    socialLinksChanged = true;
    const value = asRecord["instagramId"];
    if (value === null || value === undefined || value === "") {
      delete socialLinks.instagram;
    } else {
      socialLinks.instagram = value;
    }
  }

  if (socialLinksChanged) {
    payload.socialLinksJson = socialLinks as never;
  }

  const preferences: Record<string, unknown> = existingProfile?.preferencesJson
    ? { ...existingProfile.preferencesJson }
    : {};
  let preferencesChanged = false;

  if ("wardName" in asRecord) {
    preferencesChanged = true;
    const value = asRecord["wardName"];
    if (value === null || value === undefined || value === "") {
      delete preferences.wardName;
    } else {
      preferences.wardName = value;
    }
  }

  if (preferencesChanged) {
    payload.preferencesJson = preferences as never;
  }

  if (payload.referredBy !== undefined) {
    const referredValue = payload.referredBy as unknown;
    if (typeof referredValue === "string") {
      const trimmed = referredValue.trim();
      payload.referredBy = (trimmed === "" ? null : trimmed) as never;
    }
  }

  PROFILE_GEO_INTEGER_FIELDS.forEach((field) => {
    if (!(field in payload)) {
      return;
    }

    const value = payload[field] as unknown;
    if (value === undefined || value === null || value === "") {
      return;
    }

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new ApiError(`${field} must be a positive integer in profile`, 400);
    }

    payload[field] = parsed as never;
  });

  const settlementTypeValue = payload.settlementType as unknown;
  if (settlementTypeValue !== undefined) {
    if (settlementTypeValue === null || settlementTypeValue === "") {
      payload.settlementType = null as never;
    } else {
      const parsed = parseSettlementType(settlementTypeValue);
      if (!parsed) {
        throw new ApiError("settlementType must be one of URBAN or RURAL", 400);
      }
      payload.settlementType = parsed as never;
    }
  }

  const governingBodyValue = payload.governingBody as unknown;
  if (governingBodyValue !== undefined) {
    if (governingBodyValue === null || governingBodyValue === "") {
      payload.governingBody = null as never;
    } else {
      const parsed = parseLocalBodyType(governingBodyValue);
      if (!parsed) {
        throw new ApiError("governingBody must be one of GBA, CC, CMC, TMC, TP, GP", 400);
      }
      payload.governingBody = parsed as never;
    }
  }

  const branchSettlementType =
    (payload.settlementType as string | null | undefined) ??
    (existingProfile?.settlementType as string | null | undefined) ??
    null;
  const branchGoverningBody =
    (payload.governingBody as string | null | undefined) ??
    (existingProfile?.governingBody as string | null | undefined) ??
    null;
  const isRuralBranch = branchSettlementType === "RURAL" || branchGoverningBody === "GP";
  const isUrbanBranch =
    branchSettlementType === "URBAN" || (!!branchGoverningBody && branchGoverningBody !== "GP");

  if (isRuralBranch) {
    payload.localBodyId = null as never;
    payload.wardNumberId = null as never;
  }

  if (isUrbanBranch) {
    payload.hobaliId = null as never;
    payload.gramPanchayatId = null as never;
    payload.mainVillageId = null as never;
    payload.subVillageId = null as never;
  }

  const resolvedGoverningBody = getPayloadOrExisting<string>(
    "governingBody",
    existingProfile?.governingBody
  );
  const resolvedLocalBodyId = getPayloadOrExisting<number>(
    "localBodyId",
    existingProfile?.localBodyId
  );
  const resolvedGramPanchayatId = getPayloadOrExisting<number>(
    "gramPanchayatId",
    existingProfile?.gramPanchayatId
  );
  const resolvedSettlementType = getPayloadOrExisting<string>(
    "settlementType",
    existingProfile?.settlementType
  );
  if (resolvedGoverningBody === "GP" && !resolvedGramPanchayatId) {
    throw new ApiError("gramPanchayatId is required when governingBody is GP", 400);
  }
  if (resolvedGoverningBody === "GP" && resolvedLocalBodyId) {
    throw new ApiError("localBodyId must not be set when governingBody is GP", 400);
  }
  if (
    resolvedSettlementType === "RURAL" &&
    resolvedGoverningBody &&
    resolvedGoverningBody !== "GP"
  ) {
    throw new ApiError("RURAL profile rows must use governingBody GP", 400);
  }

  return payload;
};

export const resolveProfileGeoUnitId = async (
  profileAttributes: Partial<CreationAttributes<UserProfile>>,
  existingProfile?: UserProfile | null
): Promise<number | null | undefined> => {
  const shouldResolve = PROFILE_GEO_RESOLUTION_FIELDS.some((field) =>
    Object.prototype.hasOwnProperty.call(profileAttributes, field)
  );

  if (!shouldResolve) {
    return undefined;
  }

  const hasProfileField = (field: (typeof PROFILE_GEO_RESOLUTION_FIELDS)[number]): boolean =>
    Object.prototype.hasOwnProperty.call(profileAttributes, field);
  const getProfileOrExisting = <T>(
    field: (typeof PROFILE_GEO_RESOLUTION_FIELDS)[number],
    existingValue: T | null | undefined
  ): T | null =>
    hasProfileField(field)
      ? ((profileAttributes[field] as T | null | undefined) ?? null)
      : (existingValue ?? null);

  const merged = {
    stateId: getProfileOrExisting<number>("stateId", existingProfile?.stateId),
    districtId: getProfileOrExisting<number>("districtId", existingProfile?.districtId),
    talukId: getProfileOrExisting<number>("talukId", existingProfile?.talukId),
    mpConstituencyId: getProfileOrExisting<number>(
      "mpConstituencyId",
      existingProfile?.mpConstituencyId
    ),
    mlaConstituencyId: getProfileOrExisting<number>(
      "mlaConstituencyId",
      existingProfile?.mlaConstituencyId
    ),
    settlementType: getProfileOrExisting<string>(
      "settlementType",
      existingProfile?.settlementType
    ),
    governingBody: getProfileOrExisting<string>("governingBody", existingProfile?.governingBody),
    localBodyId: getProfileOrExisting<number>("localBodyId", existingProfile?.localBodyId),
    hobaliId: getProfileOrExisting<number>("hobaliId", existingProfile?.hobaliId),
    gramPanchayatId: getProfileOrExisting<number>(
      "gramPanchayatId",
      existingProfile?.gramPanchayatId
    ),
    mainVillageId: getProfileOrExisting<number>("mainVillageId", existingProfile?.mainVillageId),
    subVillageId: getProfileOrExisting<number>("subVillageId", existingProfile?.subVillageId),
    wardNumberId: getProfileOrExisting<number>("wardNumberId", existingProfile?.wardNumberId),
    pollingStationId: getProfileOrExisting<number>(
      "pollingStationId",
      existingProfile?.pollingStationId
    ),
    boothNumberId: getProfileOrExisting<number>("boothNumberId", existingProfile?.boothNumberId)
  };

  const resolvedSettlementType = merged.settlementType;
  const resolvedGoverningBody = merged.governingBody;
  const isRuralBranch = resolvedSettlementType === "RURAL" || resolvedGoverningBody === "GP";
  const isUrbanBranch =
    resolvedSettlementType === "URBAN" ||
    (!!resolvedGoverningBody && resolvedGoverningBody !== "GP");

  if (isRuralBranch) {
    merged.localBodyId = null;
    merged.wardNumberId = null;
  }

  if (isUrbanBranch) {
    merged.hobaliId = null;
    merged.gramPanchayatId = null;
    merged.mainVillageId = null;
    merged.subVillageId = null;
  }

  const hasAnyGeoValue = Object.values(merged).some((value) => value !== null && value !== undefined);
  if (!hasAnyGeoValue) {
    return null;
  }

  const where: Record<string, unknown> = {};
  PROFILE_GEO_RESOLUTION_FIELDS.forEach((field) => {
    const value = merged[field];
    if (value !== null && value !== undefined) {
      where[field] = value;
    }
  });

  const matches = await GeoPolitical.findAll({
    where,
    attributes: ["id"],
    limit: 2,
    raw: true
  });

  if (matches.length === 1) {
    return Number(matches[0].id);
  }

  if (matches.length === 0) {
    throw new ApiError(
      "profile geo fields do not resolve to any geoUnit. Update the geo selection to a valid leaf.",
      400
    );
  }

  throw new ApiError(
    "profile geo fields resolve to multiple geoUnits. Provide a more specific geo selection.",
    400
  );
};
