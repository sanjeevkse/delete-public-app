import type { CreationAttributes } from "sequelize";

import { ApiError } from "../middlewares/errorHandler";
import type UserProfile from "../models/UserProfile";

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
  "religionId",
  "mainCasteId",
  "subCasteId",
  "voterIdNumber",
  "voterIdPhoto",
  "aadhaarPhoto",
  "rationCardNo",
  "rationCardPhoto",
  "employmentGroupId",
  "relationshipTypeId",
  "relationshipName",
  "residenceTypeId",
  "nativePlace",
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
  "mpConstituencyId",
  "mlaConstituencyId",
  "governingBody",
  "gramPanchayatId",
  "mainVillageId",
  "voterListBoothNo",
  "voterListSlNo",
  "mapBoothNo",
  "mapSlNo",
  "mapSubSlNo",
  "wardNumberId",
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

export const buildProfileAttributes = (
  input: ProfileInput,
  existingProfile?: UserProfile | null
): Partial<CreationAttributes<UserProfile>> => {
  if (!input || typeof input !== "object") {
    return {};
  }

  const payload: Partial<CreationAttributes<UserProfile>> = {};
  const asRecord = input as Record<string, unknown>;

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

  const governingBodyValue = payload.governingBody;
  if (governingBodyValue !== undefined) {
    if (governingBodyValue === null) {
      payload.governingBody = null as never;
    } else if (
      typeof governingBodyValue === "string" &&
      ["GBA", "TMC", "CMC", "GP"].includes(governingBodyValue)
    ) {
      payload.governingBody = governingBodyValue as never;
    } else {
      throw new ApiError("governingBody must be one of GBA, TMC, CMC, GP", 400);
    }
  }

  const resolvedGoverningBody =
    (payload.governingBody as string | null | undefined) ??
    (existingProfile?.governingBody as string | null | undefined) ??
    null;
  const resolvedGramPanchayatId =
    (payload.gramPanchayatId as number | null | undefined) ??
    (existingProfile?.gramPanchayatId as number | null | undefined) ??
    null;
  if (resolvedGoverningBody === "GP" && !resolvedGramPanchayatId) {
    throw new ApiError("gramPanchayatId is required when governingBody is GP", 400);
  }

  return payload;
};
