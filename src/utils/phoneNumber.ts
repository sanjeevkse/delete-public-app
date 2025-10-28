import { ApiError } from "../middlewares/errorHandler";

const REQUIRED_DIGIT_LENGTH = 10;

const toTrimmedString = (input: unknown, fieldName: string): string => {
  if (input === null || input === undefined) {
    throw new ApiError(`${fieldName} is required`, 400);
  }

  if (typeof input === "number" && Number.isFinite(input)) {
    return Math.trunc(input).toString();
  }

  if (typeof input !== "string") {
    throw new ApiError(`${fieldName} must be a string`, 400);
  }

  const trimmed = input.trim();
  if (!trimmed) {
    throw new ApiError(`${fieldName} is required`, 400);
  }

  return trimmed;
};

const stripCountryPrefix = (digits: string): string => {
  let sanitized = digits;
  let changed = true;

  while (sanitized.length > REQUIRED_DIGIT_LENGTH && changed) {
    changed = false;

    if (sanitized.startsWith("00")) {
      sanitized = sanitized.slice(2);
      changed = true;
    } else if (sanitized.startsWith("0")) {
      sanitized = sanitized.slice(1);
      changed = true;
    } else if (sanitized.startsWith("91")) {
      sanitized = sanitized.slice(2);
      changed = true;
    }
  }

  if (sanitized.length > REQUIRED_DIGIT_LENGTH) {
    sanitized = sanitized.slice(-REQUIRED_DIGIT_LENGTH);
  }

  return sanitized;
};

export const normalizePhoneNumber = (
  input: unknown,
  fieldName: string = "contactNumber"
): string => {
  const trimmed = toTrimmedString(input, fieldName);
  const digitsOnly = trimmed.replace(/\D/g, "");

  if (!digitsOnly) {
    throw new ApiError(`${fieldName} must contain digits`, 400);
  }

  const sanitized = stripCountryPrefix(digitsOnly);

  if (sanitized.length !== REQUIRED_DIGIT_LENGTH) {
    throw new ApiError(`${fieldName} must be a 10 digit number`, 400);
  }

  if (!/^[0-9]{10}$/.test(sanitized)) {
    throw new ApiError(`${fieldName} must contain only digits`, 400);
  }

  return sanitized;
};

export const normalizeOptionalPhoneNumber = (
  input: unknown,
  fieldName: string = "contactNumber"
): string | null => {
  if (input === undefined || input === null) {
    return null;
  }

  if (typeof input === "string" && input.trim() === "") {
    return null;
  }

  return normalizePhoneNumber(input, fieldName);
};
