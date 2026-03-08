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
  "employmentId",
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
  "employmentTypeId",
  "relationshipTypeId",
  "relationshipName",
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

  if (payload.employmentId === undefined && "employment_id" in asRecord) {
    payload.employmentId = asRecord["employment_id"] as never;
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
