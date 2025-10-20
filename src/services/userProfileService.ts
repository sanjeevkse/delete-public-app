import type { CreationAttributes } from "sequelize";

import type UserProfile from "../models/UserProfile";

type ProfileInput = Record<string, unknown> | undefined | null;

const DIRECT_PROFILE_FIELDS: Array<keyof CreationAttributes<UserProfile>> = [
  "displayName",
  "alernativeContactNumber",
  "bio",
  "dateOfBirth",
  "gender",
  "occupation",
  "profileImageUrl",
  "fullAddress",
  "addressLine1",
  "addressLine2",
  "city",
  "state",
  "postalCode",
  "country",
  "wardNumberId",
  "boothNumberNumberId",
  "isRegistrationAgreed",
  "latitude",
  "longitude",
  "socialLinksJson",
  "preferencesJson",
  "status"
];

const OPTIONAL_ALIASES: Record<string, keyof CreationAttributes<UserProfile>> = {
  address: "fullAddress"
};

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

  Object.entries(OPTIONAL_ALIASES).forEach(([alias, targetField]) => {
    if (alias in asRecord) {
      payload[targetField] = asRecord[alias] as never;
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

  return payload;
};
