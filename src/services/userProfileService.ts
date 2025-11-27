import type { CreationAttributes } from "sequelize";

import type UserProfile from "../models/UserProfile";

type ProfileInput = Record<string, unknown> | undefined | null;

const DIRECT_PROFILE_FIELDS: Array<keyof CreationAttributes<UserProfile>> = [
  "displayName",
  "alernativeContactNumber",
  "aadhaarNumber",
  "bio",
  "dateOfBirth",
  "gender",
  "occupation",
  "referredBy",
  "fullAddress",
  "addressLine1",
  "addressLine2",
  "city",
  "state",
  "postalCode",
  "country",
  "wardNumberId",
  "boothNumberId",
  "emergencyContact",
  "education",
  "dateOfJoining",
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
  const hasOwn = (obj: object, key: string) => Object.prototype.hasOwnProperty.call(obj, key);

  const parseOptionalInt = (
    value: unknown,
    { allowZero = false }: { allowZero?: boolean } = {}
  ): number | null | undefined => {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    const normalized =
      typeof value === "number" ? value : Number.parseInt(String(value).trim(), 10);

    if (Number.isNaN(normalized) || !Number.isFinite(normalized)) {
      return null;
    }

    const truncated = Math.trunc(normalized);
    if (!allowZero && truncated <= 0) {
      return null;
    }

    return truncated;
  };

  const normalizeString = (value: unknown): string | null | undefined => {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }

    const raw = typeof value === "string" ? value : String(value);
    const trimmed = raw.trim();
    return trimmed === "" ? null : trimmed;
  };

  const normalizeDateOnly = (value: unknown): string | Date | null | undefined => {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    const raw = String(value).trim();
    return raw === "" ? null : raw;
  };

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

  if (hasOwn(asRecord, "wardNumberId")) {
    const wardValue = parseOptionalInt(asRecord["wardNumberId"]);
    if (wardValue !== undefined) {
      payload.wardNumberId = wardValue as never;
    }
  }

  if (hasOwn(asRecord, "boothNumberId")) {
    const boothValue = parseOptionalInt(asRecord["boothNumberId"]);
    if (boothValue !== undefined) {
      payload.boothNumberId = boothValue as never;
    }
  }

  const emergencySource =
    asRecord["emergencyContact"] ??
    asRecord["emergencyContactNumber"] ??
    asRecord["emergencyContactName"] ??
    asRecord["emergencyContactPhone"];
  if (emergencySource !== undefined) {
    const emergencyValue = normalizeString(emergencySource);
    if (emergencyValue !== undefined) {
      payload.emergencyContact = emergencyValue as never;
    }
  } else if (hasOwn(payload, "emergencyContact") && payload.emergencyContact !== undefined) {
    const emergencyValue = normalizeString(payload.emergencyContact);
    if (emergencyValue !== undefined) {
      payload.emergencyContact = emergencyValue as never;
    }
  }

  const educationSource = asRecord["education"] ?? asRecord["educationLevel"];
  if (educationSource !== undefined) {
    const educationValue = normalizeString(educationSource);
    if (educationValue !== undefined) {
      payload.education = educationValue as never;
    }
  } else if (hasOwn(payload, "education") && payload.education !== undefined) {
    const educationValue = normalizeString(payload.education);
    if (educationValue !== undefined) {
      payload.education = educationValue as never;
    }
  }

  const dateOfBirthValue = normalizeDateOnly(asRecord["dateOfBirth"]);
  if (dateOfBirthValue !== undefined) {
    payload.dateOfBirth = dateOfBirthValue as never;
  }

  const joiningSource = asRecord["dateOfJoining"] ?? asRecord["joiningDate"] ?? asRecord["doj"];
  if (joiningSource !== undefined) {
    const joiningValue = normalizeDateOnly(joiningSource);
    if (joiningValue !== undefined) {
      payload.dateOfJoining = joiningValue as never;
    }
  } else if (hasOwn(payload, "dateOfJoining") && payload.dateOfJoining !== undefined) {
    const joiningValue = normalizeDateOnly(payload.dateOfJoining);
    if (joiningValue !== undefined) {
      payload.dateOfJoining = joiningValue as never;
    }
  }

  if (payload.referredBy !== undefined) {
    const referredValue = payload.referredBy as unknown;
    if (typeof referredValue === "string") {
      const trimmed = referredValue.trim();
      payload.referredBy = (trimmed === "" ? null : trimmed) as never;
    }
  }

  return payload;
};
