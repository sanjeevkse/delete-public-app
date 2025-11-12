import type { Express, Request, Response } from "express";
import { Op, type WhereOptions } from "sequelize";

import { ApiError } from "../middlewares/errorHandler";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { requireAuthenticatedUser } from "../middlewares/authMiddleware";
import { buildPublicUploadPath } from "../middlewares/uploadMiddleware";
import UserSchemeApplication, {
  USER_SCHEME_APPLICANT_TYPES,
  type UserSchemeApplicantType
} from "../models/UserSchemeApplication";
import Scheme from "../models/Scheme";
import MetaWardNumber from "../models/MetaWardNumber";
import MetaBoothNumber from "../models/MetaBoothNumber";
import MetaGovernmentLevel from "../models/MetaGovernmentLevel";
import MetaSector from "../models/MetaSector";
import MetaSchemeTypeLookup from "../models/MetaSchemeTypeLookup";
import MetaOwnershipType from "../models/MetaOwnershipType";
import MetaGenderOption from "../models/MetaGenderOption";
import MetaWidowStatus from "../models/MetaWidowStatus";
import MetaDisabilityStatus from "../models/MetaDisabilityStatus";
import MetaEmploymentStatus from "../models/MetaEmploymentStatus";
import User from "../models/User";
import asyncHandler from "../utils/asyncHandler";
import {
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendSuccessWithPagination,
  parsePaginationParams,
  calculatePagination
} from "../utils/apiResponse";
import { buildQueryAttributes, shouldIncludeAuditFields } from "../utils/queryAttributes";
import { normalizeOptionalPhoneNumber, normalizePhoneNumber } from "../utils/phoneNumber";
import { assertNoRestrictedFields } from "../utils/payloadValidation";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PIN_CODE_REGEX = /^\d{6}$/;
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const SORTABLE_FIELDS = new Map<string, string>([
  ["createdAt", "createdAt"],
  ["updatedAt", "updatedAt"],
  ["submittedAt", "submittedAt"],
  ["applicantName", "applicantName"]
]);

type NormalizedApplicationPayload = {
  schemeId: number;
  applicantType: UserSchemeApplicantType;
  applicantUserId: number | null;
  applicantName: string;
  mobilePrimary: string;
  mobileAlternate: string | null;
  email: string | null;
  addressLine: string;
  wardNumberId: number | null;
  boothNumberId: number | null;
  doorNumber: string | null;
  floorNumber: string | null;
  ownershipTypeId: number | null;
  mainRoad: string | null;
  crossRoad: string | null;
  locality: string | null;
  pinCode: string | null;
  governmentLevelId: number;
  sectorId: number;
  schemeTypeId: number;
  schemeDescription: string | null;
  voterId: string | null;
  aadhaarId: string | null;
  dob: Date | null;
  genderOptionId: number | null;
  widowStatusId: number | null;
  disabilityStatusId: number | null;
  educationLevel: string | null;
  employmentStatusId: number | null;
  termsAccepted: boolean | null;
};

type ApplicationAttributesPayload = Omit<NormalizedApplicationPayload, "termsAccepted">;

const applicantTypeLookup = new Set(USER_SCHEME_APPLICANT_TYPES);

const firstQueryValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.length > 0 ? value[0] : undefined;
  }
  return value;
};

const parseOptionalQueryPositiveInt = (value: unknown, field: string): number | undefined => {
  const normalized = firstQueryValue(value);
  if (normalized === undefined || normalized === null) {
    return undefined;
  }
  if (typeof normalized === "string" && normalized.trim() === "") {
    return undefined;
  }
  return parsePositiveInt(normalized, field);
};

const baseInclude = [
  { association: "scheme", attributes: ["id", "schemeName"], required: false },
  {
    association: "applicant",
    attributes: ["id", "fullName", "contactNumber", "email"],
    required: false
  },
  {
    association: "reviewer",
    attributes: ["id", "fullName", "contactNumber", "email"],
    required: false
  },
  { association: "wardNumber", attributes: ["id", "dispName"], required: false },
  { association: "boothNumber", attributes: ["id", "dispName"], required: false },
  { association: "governmentLevel", attributes: ["id", "dispName"], required: false },
  { association: "sector", attributes: ["id", "dispName"], required: false },
  { association: "schemeType", attributes: ["id", "dispName"], required: false },
  { association: "ownershipType", attributes: ["id", "dispName"], required: false },
  { association: "genderOption", attributes: ["id", "dispName"], required: false },
  { association: "widowStatus", attributes: ["id", "dispName"], required: false },
  { association: "disabilityStatus", attributes: ["id", "dispName"], required: false },
  { association: "employmentStatus", attributes: ["id", "dispName"], required: false }
];

const parsePositiveInt = (value: unknown, field: string): number => {
  const numeric = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new ApiError(`${field} must be a positive integer`, 400);
  }
  return numeric;
};

const parseNullableInt = (value: unknown, field: string): number | null => {
  if (value === undefined || value === null || `${value}`.trim() === "") {
    return null;
  }
  return parsePositiveInt(value, field);
};

const parseRequiredString = (value: unknown, field: string, maxLength?: number): string => {
  if (typeof value !== "string") {
    throw new ApiError(`${field} is required`, 400);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new ApiError(`${field} cannot be empty`, 400);
  }
  if (maxLength && trimmed.length > maxLength) {
    throw new ApiError(`${field} must be at most ${maxLength} characters`, 400);
  }
  return trimmed;
};

const parseOptionalString = (value: unknown, maxLength?: number): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== "string") {
    throw new ApiError("Invalid input type", 400);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (maxLength && trimmed.length > maxLength) {
    throw new ApiError(`Value must be at most ${maxLength} characters`, 400);
  }
  return trimmed;
};

const parseOptionalEmail = (value: unknown): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== "string") {
    throw new ApiError("email must be a string", 400);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    throw new ApiError("email must be a valid email address", 400);
  }
  return trimmed.toLowerCase();
};

const parseOptionalPinCode = (value: unknown): string | null => {
  const parsed = parseOptionalString(value, 10);
  if (!parsed) {
    return null;
  }
  if (!PIN_CODE_REGEX.test(parsed)) {
    throw new ApiError("pinCode must be a 6 digit number", 400);
  }
  return parsed;
};

const parseOptionalDateOnly = (value: unknown): Date | null => {
  const parsed = parseOptionalString(value, 10);
  if (!parsed) {
    return null;
  }
  if (!DATE_ONLY_REGEX.test(parsed)) {
    throw new ApiError("dob must be in YYYY-MM-DD format", 400);
  }
  const date = new Date(`${parsed}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError("dob must be in YYYY-MM-DD format", 400);
  }
  return date;
};

const parseOptionalBoolean = (value: unknown, field: string): boolean | null => {
  if (value === undefined || value === null || `${value}`.trim() === "") {
    return null;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y", "on"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "n", "off"].includes(normalized)) {
      return false;
    }
  }
  throw new ApiError(`${field} must be a boolean value`, 400);
};

const parseApplicantType = (value: unknown): UserSchemeApplicantType => {
  if (value === undefined || value === null || `${value}`.trim() === "") {
    return "SELF";
  }
  if (typeof value !== "string") {
    throw new ApiError("applicantType must be a string", 400);
  }
  const normalized = value.trim().toUpperCase();
  if (!applicantTypeLookup.has(normalized as UserSchemeApplicantType)) {
    throw new ApiError("applicantType must be either 'SELF' or 'OTHERS'", 400);
  }
  return normalized as UserSchemeApplicantType;
};

const ensureSchemeExists = async (schemeId: number): Promise<void> => {
  const scheme = await Scheme.findOne({ where: { id: schemeId, status: 1 }, attributes: ["id"] });
  if (!scheme) {
    throw new ApiError("Invalid schemeId", 400);
  }
};

const ensureWardExists = async (wardNumberId: number | null): Promise<number | null> => {
  if (wardNumberId === null) {
    return null;
  }
  const ward = await MetaWardNumber.findOne({
    where: { id: wardNumberId, status: 1 },
    attributes: ["id"]
  });
  if (!ward) {
    throw new ApiError("Invalid wardNumberId", 400);
  }
  return wardNumberId;
};

const ensureBoothExists = async (boothNumberId: number | null): Promise<number | null> => {
  if (boothNumberId === null) {
    return null;
  }
  const booth = await MetaBoothNumber.findOne({
    where: { id: boothNumberId, status: 1 },
    attributes: ["id"]
  });
  if (!booth) {
    throw new ApiError("Invalid boothNumberId", 400);
  }
  return boothNumberId;
};

type MetaModel = {
  findOne: (options: {
    where: { id: number; status: number };
    attributes: string[];
  }) => Promise<any>;
};

const ensureActiveMetaRecord = async (
  model: MetaModel,
  id: number,
  field: string
): Promise<number> => {
  const record = await model.findOne({ where: { id, status: 1 }, attributes: ["id"] });
  if (!record) {
    throw new ApiError(`Invalid ${field}`, 400);
  }
  return id;
};

const ensureOptionalActiveMetaRecord = async (
  model: MetaModel,
  id: number | null,
  field: string
): Promise<number | null> => {
  if (id === null) {
    return null;
  }
  return ensureActiveMetaRecord(model, id, field);
};

const resolveApplicantUserId = async (
  rawValue: unknown,
  applicantType: UserSchemeApplicantType,
  currentUserId: number
): Promise<number | null> => {
  if (applicantType === "SELF") {
    return currentUserId;
  }

  const parsed = parseNullableInt(rawValue, "applicantUserId");
  if (parsed === null) {
    return null;
  }

  const user = await User.findOne({ where: { id: parsed, status: 1 }, attributes: ["id"] });
  if (!user) {
    throw new ApiError("Invalid applicantUserId", 400);
  }
  return parsed;
};

const normalizeApplicationPayload = async (
  body: Record<string, unknown>,
  options: { currentUserId: number }
): Promise<NormalizedApplicationPayload> => {
  assertNoRestrictedFields(body);

  const schemeIdInput = body.schemeId ?? body.scheme_id;
  if (schemeIdInput === undefined) {
    throw new ApiError("schemeId is required", 400);
  }
  const schemeId = parsePositiveInt(schemeIdInput, "schemeId");
  await ensureSchemeExists(schemeId);

  const applicantType = parseApplicantType(
    body.applicantType ?? body.applicant_type ?? body.selfOther
  );
  const applicantUserId = await resolveApplicantUserId(
    body.applicantUserId ?? body.applicant_user_id,
    applicantType,
    options.currentUserId
  );

  const applicantName = parseRequiredString(
    body.applicantName ?? body.applicant_name ?? body.name,
    "applicantName",
    120
  );

  const primaryNumberInput =
    body.mobilePrimary ?? body.mobile_primary ?? body.mobileNumber ?? body.mobile_number;
  const mobilePrimary = normalizePhoneNumber(primaryNumberInput, "mobilePrimary");

  const alternateNumberInput =
    body.mobileAlternate ?? body.mobile_alternate ?? body.alternateMobileNumber;
  const mobileAlternate = normalizeOptionalPhoneNumber(alternateNumberInput, "mobileAlternate");

  const email = parseOptionalEmail(body.email);

  const addressLine = parseRequiredString(
    body.addressLine ?? body.address_line ?? body.address,
    "addressLine",
    255
  );

  const wardNumberId = await ensureWardExists(
    parseNullableInt(body.wardNumberId ?? body.ward_number_id, "wardNumberId")
  );
  const boothNumberId = await ensureBoothExists(
    parseNullableInt(body.boothNumberId ?? body.booth_number_id, "boothNumberId")
  );

  const doorNumber = parseOptionalString(body.doorNumber ?? body.door_number, 30);
  const floorNumber = parseOptionalString(body.floorNumber ?? body.floor_number, 30);
  const ownershipTypeId = await ensureOptionalActiveMetaRecord(
    MetaOwnershipType,
    parseNullableInt(body.ownershipTypeId ?? body.ownership_type_id, "ownershipTypeId"),
    "ownershipTypeId"
  );
  const mainRoad = parseOptionalString(body.mainRoad ?? body.main_road, 120);
  const crossRoad = parseOptionalString(body.crossRoad ?? body.cross_road, 120);
  const locality = parseOptionalString(body.locality, 120);
  const pinCode = parseOptionalPinCode(body.pinCode ?? body.pin_code);

  const governmentLevelInput = body.governmentLevelId ?? body.government_level_id;
  if (governmentLevelInput === undefined) {
    throw new ApiError("governmentLevelId is required", 400);
  }
  const governmentLevelId = await ensureActiveMetaRecord(
    MetaGovernmentLevel,
    parsePositiveInt(governmentLevelInput, "governmentLevelId"),
    "governmentLevelId"
  );

  const sectorInput = body.sectorId ?? body.sector_id;
  if (sectorInput === undefined) {
    throw new ApiError("sectorId is required", 400);
  }
  const sectorId = await ensureActiveMetaRecord(
    MetaSector,
    parsePositiveInt(sectorInput, "sectorId"),
    "sectorId"
  );

  const schemeTypeInput = body.schemeTypeId ?? body.scheme_type_id;
  if (schemeTypeInput === undefined) {
    throw new ApiError("schemeTypeId is required", 400);
  }
  const schemeTypeId = await ensureActiveMetaRecord(
    MetaSchemeTypeLookup,
    parsePositiveInt(schemeTypeInput, "schemeTypeId"),
    "schemeTypeId"
  );
  const schemeDescription = parseOptionalString(body.schemeDescription ?? body.description);

  const voterId = parseOptionalString(body.voterId ?? body.voter_id, 30);
  const aadhaarId = parseOptionalString(body.aadhaarId ?? body.aadhaar_id, 30);
  const dob = parseOptionalDateOnly(body.dob ?? body.dateOfBirth ?? body.date_of_birth);
  const genderOptionId = await ensureOptionalActiveMetaRecord(
    MetaGenderOption,
    parseNullableInt(body.genderOptionId ?? body.gender_option_id, "genderOptionId"),
    "genderOptionId"
  );
  const widowStatusId = await ensureOptionalActiveMetaRecord(
    MetaWidowStatus,
    parseNullableInt(body.widowStatusId ?? body.widow_status_id, "widowStatusId"),
    "widowStatusId"
  );
  const disabilityStatusId = await ensureOptionalActiveMetaRecord(
    MetaDisabilityStatus,
    parseNullableInt(body.disabilityStatusId ?? body.disability_status_id, "disabilityStatusId"),
    "disabilityStatusId"
  );
  const educationLevel = parseOptionalString(body.educationLevel ?? body.education, 80);
  const employmentStatusId = await ensureOptionalActiveMetaRecord(
    MetaEmploymentStatus,
    parseNullableInt(body.employmentStatusId ?? body.employment_status_id, "employmentStatusId"),
    "employmentStatusId"
  );
  const termsAccepted = parseOptionalBoolean(
    body.termsAccepted ?? body.terms_accepted,
    "termsAccepted"
  );

  return {
    schemeId,
    applicantType,
    applicantUserId,
    applicantName,
    mobilePrimary,
    mobileAlternate,
    email,
    addressLine,
    wardNumberId,
    boothNumberId,
    doorNumber,
    floorNumber,
    ownershipTypeId,
    mainRoad,
    crossRoad,
    locality,
    pinCode,
    governmentLevelId,
    sectorId,
    schemeTypeId,
    schemeDescription,
    voterId,
    aadhaarId,
    dob,
    genderOptionId,
    widowStatusId,
    disabilityStatusId,
    educationLevel,
    employmentStatusId,
    termsAccepted
  };
};

const extractDocumentUrl = (req: AuthenticatedRequest): string | undefined => {
  const files = Array.isArray(req.files) ? (req.files as Express.Multer.File[]) : [];
  if (!files.length) {
    return undefined;
  }
  return buildPublicUploadPath(files[0].path);
};

const serializeApplication = (application: UserSchemeApplication) => {
  const plain = application.get({ plain: true }) as UserSchemeApplication & {
    scheme?: { id: number; schemeName: string } | null;
    applicant?: {
      id: number;
      fullName: string | null;
      contactNumber: string | null;
      email: string | null;
    } | null;
    reviewer?: {
      id: number;
      fullName: string | null;
      contactNumber: string | null;
      email: string | null;
    } | null;
    wardNumber?: { id: number; dispName: string } | null;
    boothNumber?: { id: number; dispName: string } | null;
    governmentLevel?: { id: number; dispName: string } | null;
    sector?: { id: number; dispName: string } | null;
    schemeType?: { id: number; dispName: string } | null;
    ownershipType?: { id: number; dispName: string } | null;
    genderOption?: { id: number; dispName: string } | null;
    widowStatus?: { id: number; dispName: string } | null;
    disabilityStatus?: { id: number; dispName: string } | null;
    employmentStatus?: { id: number; dispName: string } | null;
  };

  return {
    id: plain.id,
    schemeId: plain.schemeId,
    scheme: plain.scheme ? { id: plain.scheme.id, schemeName: plain.scheme.schemeName } : null,
    applicantType: plain.applicantType,
    applicantUserId: plain.applicantUserId ?? null,
    applicant: plain.applicant
      ? {
          id: plain.applicant.id,
          fullName: plain.applicant.fullName ?? null,
          contactNumber: plain.applicant.contactNumber ?? null,
          email: plain.applicant.email ?? null
        }
      : null,
    applicantName: plain.applicantName,
    mobilePrimary: plain.mobilePrimary,
    mobileAlternate: plain.mobileAlternate ?? null,
    email: plain.email ?? null,
    addressLine: plain.addressLine,
    wardNumberId: plain.wardNumberId ?? null,
    wardNumber: plain.wardNumber
      ? { id: plain.wardNumber.id, name: plain.wardNumber.dispName }
      : null,
    boothNumberId: plain.boothNumberId ?? null,
    boothNumber: plain.boothNumber
      ? { id: plain.boothNumber.id, name: plain.boothNumber.dispName }
      : null,
    doorNumber: plain.doorNumber ?? null,
    floorNumber: plain.floorNumber ?? null,
    ownershipTypeId: plain.ownershipTypeId ?? null,
    ownershipType: plain.ownershipType
      ? { id: plain.ownershipType.id, name: plain.ownershipType.dispName }
      : null,
    mainRoad: plain.mainRoad ?? null,
    crossRoad: plain.crossRoad ?? null,
    locality: plain.locality ?? null,
    pinCode: plain.pinCode ?? null,
    governmentLevelId: plain.governmentLevelId,
    governmentLevel: plain.governmentLevel
      ? { id: plain.governmentLevel.id, name: plain.governmentLevel.dispName }
      : null,
    sectorId: plain.sectorId,
    sector: plain.sector ? { id: plain.sector.id, name: plain.sector.dispName } : null,
    schemeTypeId: plain.schemeTypeId,
    schemeType: plain.schemeType
      ? { id: plain.schemeType.id, name: plain.schemeType.dispName }
      : null,
    schemeDescription: plain.schemeDescription ?? null,
    voterId: plain.voterId ?? null,
    aadhaarId: plain.aadhaarId ?? null,
    dob: plain.dob ? new Date(plain.dob).toISOString().slice(0, 10) : null,
    genderOptionId: plain.genderOptionId ?? null,
    genderOption: plain.genderOption
      ? { id: plain.genderOption.id, name: plain.genderOption.dispName }
      : null,
    widowStatusId: plain.widowStatusId ?? null,
    widowStatus: plain.widowStatus
      ? { id: plain.widowStatus.id, name: plain.widowStatus.dispName }
      : null,
    disabilityStatusId: plain.disabilityStatusId ?? null,
    disabilityStatus: plain.disabilityStatus
      ? { id: plain.disabilityStatus.id, name: plain.disabilityStatus.dispName }
      : null,
    educationLevel: plain.educationLevel ?? null,
    employmentStatusId: plain.employmentStatusId ?? null,
    employmentStatus: plain.employmentStatus
      ? { id: plain.employmentStatus.id, name: plain.employmentStatus.dispName }
      : null,
    documentUrl: plain.documentUrl ?? null,
    termsAcceptedAt: plain.termsAcceptedAt,
    status: plain.status,
    submittedAt: plain.submittedAt ?? null,
    reviewedAt: plain.reviewedAt ?? null,
    reviewerUserId: plain.reviewerUserId ?? null,
    reviewer: plain.reviewer
      ? {
          id: plain.reviewer.id,
          fullName: plain.reviewer.fullName ?? null,
          contactNumber: plain.reviewer.contactNumber ?? null,
          email: plain.reviewer.email ?? null
        }
      : null,
    rejectionReason: plain.rejectionReason ?? null,
    createdBy: plain.createdBy ?? null,
    updatedBy: plain.updatedBy ?? null,
    createdAt: plain.createdAt ?? null,
    updatedAt: plain.updatedAt ?? null
  };
};

const parseStatusFilter = (value: unknown): number | null | undefined => {
  const normalizedValue = firstQueryValue(value);
  if (normalizedValue === undefined || normalizedValue === null || normalizedValue === "") {
    return undefined;
  }
  if (typeof normalizedValue === "string" && normalizedValue.trim().toLowerCase() === "all") {
    return null;
  }
  const numeric =
    typeof normalizedValue === "number"
      ? normalizedValue
      : Number.parseInt(String(normalizedValue), 10);
  if (!Number.isFinite(numeric) || ![0, 1].includes(numeric)) {
    throw new ApiError("status must be 0 or 1", 400);
  }
  return numeric;
};

const parseSort = (req: Request) => {
  const rawSortByValue = firstQueryValue(req.query.sortBy ?? req.query.sort_by);
  const rawSortBy =
    typeof rawSortByValue === "string" && rawSortByValue.trim() ? rawSortByValue : "createdAt";
  const sortBy = SORTABLE_FIELDS.get(rawSortBy) ?? "createdAt";
  const rawOrderValue = firstQueryValue(req.query.sortOrder ?? req.query.sort_order);
  const rawOrder =
    typeof rawOrderValue === "string" && rawOrderValue.trim() ? rawOrderValue : "DESC";
  const normalizedOrder = rawOrder.toString().trim().toUpperCase();
  const direction: "ASC" | "DESC" = normalizedOrder === "ASC" ? "ASC" : "DESC";
  return { sortBy, direction };
};

const parseApplicantTypeFilter = (value: unknown): UserSchemeApplicantType | undefined => {
  const normalizedValue = firstQueryValue(value);
  if (normalizedValue === undefined || normalizedValue === null || normalizedValue === "") {
    return undefined;
  }
  return parseApplicantType(normalizedValue);
};

export const listUserSchemeApplications = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    requireAuthenticatedUser(req);

    const { page, limit, offset } = parsePaginationParams(
      firstQueryValue(req.query.page) as string | number | undefined,
      firstQueryValue(req.query.limit) as string | number | undefined,
      20,
      100
    );
    const { sortBy, direction } = parseSort(req);

    const statusFilter = parseStatusFilter(req.query.status);
    const applicantTypeFilter = parseApplicantTypeFilter(req.query.applicantType);
    const schemeFilter = parseOptionalQueryPositiveInt(req.query.schemeId, "schemeId");
    const wardFilter = parseOptionalQueryPositiveInt(req.query.wardNumberId, "wardNumberId");
    const boothFilter = parseOptionalQueryPositiveInt(req.query.boothNumberId, "boothNumberId");

    const searchValue = firstQueryValue(req.query.search);
    const search = typeof searchValue === "string" ? searchValue.trim() : "";

    const includeAuditFields = shouldIncludeAuditFields(req.query);
    const attributes = buildQueryAttributes({ includeAuditFields, keepFields: [sortBy] });

    const where: WhereOptions = {};

    if (statusFilter === undefined) {
      where.status = 1;
    } else if (statusFilter !== null) {
      where.status = statusFilter;
    }

    if (schemeFilter !== undefined) {
      where.schemeId = schemeFilter;
    }

    if (applicantTypeFilter) {
      where.applicantType = applicantTypeFilter;
    }

    if (wardFilter !== undefined) {
      where.wardNumberId = wardFilter;
    }

    if (boothFilter !== undefined) {
      where.boothNumberId = boothFilter;
    }

    if (search) {
      const pattern = `%${search}%`;
      Object.assign(where, {
        [Op.or]: [
          { applicantName: { [Op.like]: pattern } },
          { mobilePrimary: { [Op.like]: pattern } },
          { voterId: { [Op.like]: pattern } },
          { aadhaarId: { [Op.like]: pattern } }
        ]
      });
    }

    const { rows, count } = await UserSchemeApplication.findAndCountAll({
      where,
      attributes,
      include: baseInclude,
      order: [[sortBy, direction]],
      limit,
      offset,
      distinct: true
    });

    const pagination = calculatePagination(count, page, limit);
    return sendSuccessWithPagination(
      res,
      rows.map(serializeApplication),
      pagination,
      "Applications retrieved successfully"
    );
  }
);

export const getUserSchemeApplication = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    requireAuthenticatedUser(req);
    const id = parsePositiveInt(req.params.id, "id");

    const includeAuditFields = shouldIncludeAuditFields(req.query);
    const attributes = buildQueryAttributes({ includeAuditFields });

    const application = await UserSchemeApplication.findOne({
      where: { id, status: 1 },
      attributes,
      include: baseInclude
    });

    if (!application) {
      throw new ApiError("Application not found", 404);
    }

    return sendSuccess(
      res,
      serializeApplication(application),
      "Application retrieved successfully"
    );
  }
);

export const createUserSchemeApplication = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id: userId } = requireAuthenticatedUser(req);
    const body = (req.body ?? {}) as Record<string, unknown>;

    const normalized = await normalizeApplicationPayload(body, { currentUserId: userId });
    if (normalized.termsAccepted !== true) {
      throw new ApiError("termsAccepted must be true", 400);
    }

    const documentUrl = extractDocumentUrl(req);
    if (!documentUrl) {
      throw new ApiError("document is required", 400);
    }

    const { termsAccepted, ...applicationPayload } = normalized;
    const payload: ApplicationAttributesPayload = applicationPayload;

    const created = await UserSchemeApplication.create({
      ...payload,
      documentUrl,
      termsAcceptedAt: new Date(),
      submittedAt: new Date(),
      status: 1,
      createdBy: userId,
      updatedBy: userId
    });

    await created.reload({ include: baseInclude });

    return sendCreated(res, serializeApplication(created), "Application submitted successfully");
  }
);

export const updateUserSchemeApplication = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id: userId } = requireAuthenticatedUser(req);
    const applicationId = parsePositiveInt(req.params.id, "id");

    const application = await UserSchemeApplication.findOne({
      where: { id: applicationId, status: 1 }
    });

    if (!application) {
      throw new ApiError("Application not found", 404);
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const normalized = await normalizeApplicationPayload(body, { currentUserId: userId });

    if (normalized.termsAccepted === false) {
      throw new ApiError("termsAccepted cannot be false", 400);
    }

    const documentUrl = extractDocumentUrl(req) ?? application.documentUrl;
    if (!documentUrl) {
      throw new ApiError("document is required", 400);
    }

    const { termsAccepted, ...applicationPayload } = normalized;
    const payload: ApplicationAttributesPayload = applicationPayload;

    const updateBody: ApplicationAttributesPayload & {
      documentUrl: string;
      updatedBy: number;
      termsAcceptedAt?: Date;
    } = {
      ...payload,
      documentUrl,
      updatedBy: userId
    };

    if (termsAccepted === true) {
      updateBody.termsAcceptedAt = new Date();
    }

    await application.update(updateBody);
    await application.reload({ include: baseInclude });

    return sendSuccess(res, serializeApplication(application), "Application updated successfully");
  }
);

export const deleteUserSchemeApplication = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id: userId } = requireAuthenticatedUser(req);
    const applicationId = parsePositiveInt(req.params.id, "id");

    const application = await UserSchemeApplication.findOne({
      where: { id: applicationId, status: 1 }
    });

    if (!application) {
      throw new ApiError("Application not found", 404);
    }

    await application.update({ status: 0, updatedBy: userId });

    return sendNoContent(res);
  }
);
