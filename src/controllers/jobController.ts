import type { Express, Request, Response } from "express";
import type { WhereOptions } from "sequelize";

import { ApiError } from "../middlewares/errorHandler";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { requireAuthenticatedUser } from "../middlewares/authMiddleware";
import { buildPublicUploadPath } from "../middlewares/uploadMiddleware";
import Job, { JOB_SUBMISSION_FOR, type JobSubmissionFor } from "../models/Job";
import User from "../models/User";
import asyncHandler from "../utils/asyncHandler";
import {
  sendCreated,
  sendNoContent,
  sendSuccess,
  sendSuccessWithPagination,
  parseSortDirection,
  parseRequiredString,
  parseOptionalString,
  parseStatusFilter,
  calculatePagination,
  parsePaginationParams
} from "../utils/apiResponse";
import { normalizeOptionalPhoneNumber, normalizePhoneNumber } from "../utils/phoneNumber";
import { buildQueryAttributes, shouldIncludeAuditFields } from "../utils/queryAttributes";
import { assertNoRestrictedFields } from "../utils/payloadValidation";
import { PUBLIC_ROLE_NAME } from "../config/rbac";

const PAGE_DEFAULT = 1;
const LIMIT_DEFAULT = 20;
const LIMIT_MAX = 100;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RequestBody = Record<string, unknown>;

const pickBodyValue = (
  body: RequestBody,
  keys: string[]
): { provided: boolean; value: unknown } => {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      return { provided: true, value: body[key] };
    }
  }
  return { provided: false, value: undefined };
};

const parseSubmittedFor = (value: unknown): JobSubmissionFor => {
  if (typeof value !== "string") {
    throw new ApiError("submitted_for is required", 400);
  }
  const normalized = value.trim().toLowerCase();
  const allowed = new Set(JOB_SUBMISSION_FOR);
  if (!allowed.has(normalized as JobSubmissionFor)) {
    throw new ApiError("submitted_for must be either 'self' or 'others'", 400);
  }
  return normalized as JobSubmissionFor;
};

const parseEmail = (value: unknown, required: boolean): string | null => {
  if (value === undefined || value === null || value === "") {
    if (required) {
      throw new ApiError("email is required", 400);
    }
    return null;
  }
  if (typeof value !== "string") {
    throw new ApiError("email must be a string", 400);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    if (required) {
      throw new ApiError("email is required", 400);
    }
    return null;
  }
  if (!emailRegex.test(trimmed)) {
    throw new ApiError("email must be a valid email address", 400);
  }
  return trimmed.toLowerCase();
};

const resolveRequiredStringField = (
  body: RequestBody,
  keys: string[],
  fallback: string | null | undefined,
  field: string
): string => {
  const { provided, value } = pickBodyValue(body, keys);
  if (provided) {
    return parseRequiredString(value, field);
  }
  if (typeof fallback === "string" && fallback.trim()) {
    return fallback;
  }
  throw new ApiError(`${field} is required`, 400);
};

const resolveOptionalStringField = (
  body: RequestBody,
  keys: string[],
  fallback: string | null | undefined
): string | null => {
  const { provided, value } = pickBodyValue(body, keys);
  if (provided) {
    return parseOptionalString(value);
  }
  if (fallback === undefined) {
    return null;
  }
  return fallback ?? null;
};

const resolveEmailField = (
  body: RequestBody,
  fallback: string | null | undefined,
  required: boolean
): string | null => {
  const { provided, value } = pickBodyValue(body, ["email"]);
  if (provided) {
    return parseEmail(value, required);
  }
  if (fallback && emailRegex.test(fallback)) {
    return fallback.toLowerCase();
  }
  if (required) {
    throw new ApiError("email is required", 400);
  }
  return null;
};

const resolveApplicantUserId = async (
  rawValue: unknown,
  submittedFor: JobSubmissionFor,
  currentUserId: number
): Promise<number | null> => {
  if (submittedFor === "self") {
    return currentUserId;
  }

  if (rawValue === undefined) {
    return null;
  }

  if (rawValue === null || rawValue === "") {
    return null;
  }

  const numericValue =
    typeof rawValue === "number" ? rawValue : Number.parseInt(String(rawValue), 10);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    throw new ApiError("applicant_user_id must be a positive integer", 400);
  }

  const user = await User.findByPk(numericValue, {
    attributes: ["id"]
  });

  if (!user) {
    throw new ApiError("applicant_user_id does not reference a valid user", 400);
  }

  return numericValue;
};

const extractResumeUrl = (req: AuthenticatedRequest): string | undefined => {
  const files = Array.isArray(req.files) ? (req.files as Express.Multer.File[]) : [];
  if (files.length === 0) {
    return undefined;
  }
  const [file] = files;
  return buildPublicUploadPath(file.path);
};

const serializeJob = (job: Job) => {
  const plain = job.get({ plain: true }) as Job & {
    applicant?: (User & { profile?: { profileImageUrl?: string | null } | null }) | null;
  };

  return {
    id: plain.id,
    submittedFor: plain.submittedFor,
    applicantUserId: plain.applicantUserId ?? null,
    fullName: plain.fullName,
    contactNumber: plain.contactNumber,
    email: plain.email ?? null,
    alternativeContactNumber: plain.alternativeContactNumber ?? null,
    fullAddress: plain.fullAddress,
    education: plain.education ?? null,
    workExperience: plain.workExperience ?? null,
    description: plain.description,
    resumeUrl: plain.resumeUrl ?? null,
    status: plain.status,
    createdBy: plain.createdBy ?? null,
    updatedBy: plain.updatedBy ?? null,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
    applicant: plain.applicant
      ? {
          id: plain.applicant.id,
          fullName: plain.applicant.fullName,
          contactNumber: plain.applicant.contactNumber,
          email: plain.applicant.email,
          profilePhoto: plain.applicant.profile?.profileImageUrl ?? null
        }
      : null
  };
};

const buildJobInclude = () => [
  {
    association: "applicant",
    attributes: ["id", "fullName", "contactNumber", "email"],
    required: false,
    include: [
      {
        association: "profile",
        attributes: ["profileImageUrl"],
        required: false,
        include: [
          { association: "gender", attributes: ["id", "dispName"], required: false },
          { association: "maritalStatus", attributes: ["id", "dispName"], required: false },
          { association: "wardNumber", attributes: ["id", "dispName"], required: false },
          { association: "boothNumber", attributes: ["id", "dispName"], required: false }
        ]
      }
    ]
  }
];

const normalizeJobPayload = async (
  req: AuthenticatedRequest,
  options: {
    existingJob?: Job | null;
    currentUserId: number;
  }
) => {
  const { existingJob, currentUserId } = options;
  const body = (req.body ?? {}) as RequestBody;
  assertNoRestrictedFields(body);

  const { provided: submittedProvided, value: submittedValue } = pickBodyValue(body, [
    "submittedFor",
    "submitted_for"
  ]);

  const submittedFor = submittedProvided
    ? parseSubmittedFor(submittedValue)
    : (existingJob?.submittedFor ??
      (() => {
        throw new ApiError("submitted_for is required", 400);
      })());

  let selfApplicant:
    | (User & {
        profile?: { fullAddress?: string | null; alernativeContactNumber?: string | null } | null;
      })
    | null = null;

  if (submittedFor === "self") {
    selfApplicant = await User.findByPk(currentUserId, {
      attributes: ["id", "fullName", "contactNumber", "email"],
      include: [
        {
          association: "profile",
          attributes: ["fullAddress", "alernativeContactNumber"],
          include: [
            { association: "gender", attributes: ["id", "dispName"], required: false },
            { association: "maritalStatus", attributes: ["id", "dispName"], required: false },
            { association: "wardNumber", attributes: ["id", "dispName"], required: false },
            { association: "boothNumber", attributes: ["id", "dispName"], required: false }
          ]
        }
      ]
    });

    if (!selfApplicant) {
      throw new ApiError("Authenticated user not found", 404);
    }
  }

  const normalizeNullableString = (input: string | null | undefined): string | null => {
    if (input === undefined || input === null) {
      return null;
    }
    const trimmed = input.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  let fullName: string;
  if (submittedFor === "self") {
    const derived =
      normalizeNullableString(selfApplicant?.fullName) ??
      normalizeNullableString(existingJob?.fullName);
    if (!derived) {
      throw new ApiError(
        "full_name is required for self submissions. Please update your profile information.",
        400
      );
    }
    fullName = derived;
  } else {
    fullName = resolveRequiredStringField(
      body,
      ["fullName", "full_name"],
      existingJob?.fullName,
      "full_name"
    );
  }

  let contactNumber: string;
  if (submittedFor === "self") {
    const derived = normalizeNullableString(selfApplicant?.contactNumber);
    if (!derived) {
      throw new ApiError(
        "contact_number is required for self submissions. Please update your profile information.",
        400
      );
    }
    contactNumber = derived;
  } else {
    contactNumber = resolveRequiredStringField(
      body,
      ["contactNumber", "contact_number"],
      existingJob?.contactNumber,
      "contact_number"
    );
  }

  let fullAddress: string;
  if (submittedFor === "self") {
    const derived =
      normalizeNullableString(selfApplicant?.profile?.fullAddress) ??
      normalizeNullableString(existingJob?.fullAddress);
    if (!derived) {
      throw new ApiError(
        "full_address is required for self submissions. Please update your profile information.",
        400
      );
    }
    fullAddress = derived;
  } else {
    fullAddress = resolveRequiredStringField(
      body,
      ["fullAddress", "full_address"],
      existingJob?.fullAddress,
      "full_address"
    );
  }

  const education = resolveRequiredStringField(
    body,
    ["education"],
    existingJob?.education,
    "education"
  );

  const workExperience = resolveRequiredStringField(
    body,
    ["workExperience", "work_experience"],
    existingJob?.workExperience,
    "work_experience"
  );

  const description = resolveOptionalStringField(body, ["description"], existingJob?.description);

  let alternativeContactNumber =
    submittedFor === "self"
      ? (normalizeNullableString(selfApplicant?.profile?.alernativeContactNumber) ??
        existingJob?.alternativeContactNumber ??
        null)
      : resolveOptionalStringField(
          body,
          ["alternativeContactNumber", "alternative_contact_number"],
          existingJob?.alternativeContactNumber
        );

  const email =
    submittedFor === "self"
      ? (normalizeNullableString(selfApplicant?.email)?.toLowerCase() ??
        normalizeNullableString(existingJob?.email)?.toLowerCase() ??
        null)
      : resolveEmailField(body, existingJob?.email, true);

  const { provided: applicantProvided, value: applicantValue } = pickBodyValue(body, [
    "applicantUserId",
    "applicant_user_id"
  ]);

  const applicantUserId =
    submittedFor === "self"
      ? currentUserId
      : await resolveApplicantUserId(
          applicantProvided ? applicantValue : (existingJob?.applicantUserId ?? null),
          submittedFor,
          currentUserId
        );

  contactNumber = normalizePhoneNumber(contactNumber, "contact_number");
  alternativeContactNumber = normalizeOptionalPhoneNumber(
    alternativeContactNumber,
    "alternative_contact_number"
  );

  return {
    submittedFor,
    fullName,
    contactNumber,
    email,
    alternativeContactNumber,
    fullAddress,
    education,
    workExperience,
    description,
    applicantUserId
  };
};

export const listJobs = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId, roles } = requireAuthenticatedUser(req);

  const { page, limit, offset } = parsePaginationParams(
    req.query.page as string | undefined,
    req.query.limit as string | undefined,
    20,
    100
  );
  const submittedForFilterValue = req.query.submittedFor ?? req.query.submitted_for;
  const statusFilter = parseStatusFilter(req.query.status);
  const sortDirection = parseSortDirection(
    (req.query.sort ?? req.query.sortDirection) as string | undefined
  );

  const includeAuditFields = shouldIncludeAuditFields(req.query);
  const attributes = buildQueryAttributes({
    includeAuditFields,
    keepFields: ["createdAt", "createdBy", "updatedBy"]
  });

  const where: WhereOptions = {};
  const normalizedRoles = roles.map((role) => role.toLowerCase());
  const isPublicOnly =
    normalizedRoles.length === 1 && normalizedRoles[0] === PUBLIC_ROLE_NAME.toLowerCase();

  if (statusFilter === undefined) {
    where.status = 1;
  } else if (statusFilter !== null) {
    where.status = statusFilter;
  }

  if (isPublicOnly) {
    where.createdBy = userId;
  }

  if (submittedForFilterValue !== undefined) {
    where.submittedFor = parseSubmittedFor(submittedForFilterValue);
  }

  const { rows, count } = await Job.findAndCountAll({
    where,
    attributes,
    include: buildJobInclude(),
    limit,
    offset,
    order: [["createdAt", sortDirection]]
  });

  const totalPages = limit > 0 ? Math.ceil(count / limit) : 0;

  return sendSuccessWithPagination(
    res,
    rows.map(serializeJob),
    {
      page,
      limit,
      total: count,
      totalPages
    },
    "Jobs retrieved successfully"
  );
});

export const getJob = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  requireAuthenticatedUser(req);

  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw new ApiError("Invalid job id", 400);
  }

  const includeAuditFields = shouldIncludeAuditFields(req.query);
  const attributes = buildQueryAttributes({
    includeAuditFields,
    keepFields: ["createdBy", "updatedBy"]
  });

  const job = await Job.findOne({
    where: { id, status: 1 },
    attributes,
    include: buildJobInclude()
  });

  if (!job) {
    throw new ApiError("Job not found", 404);
  }

  return sendSuccess(res, serializeJob(job), "Job details retrieved successfully");
});

export const createJob = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);

  const payload = await normalizeJobPayload(req, { currentUserId: userId });
  const resumeUrl = extractResumeUrl(req);

  const createdJob = await Job.create({
    submittedFor: payload.submittedFor,
    applicantUserId: payload.applicantUserId,
    fullName: payload.fullName,
    contactNumber: payload.contactNumber,
    email: payload.email,
    alternativeContactNumber: payload.alternativeContactNumber,
    fullAddress: payload.fullAddress,
    education: payload.education,
    workExperience: payload.workExperience,
    description: payload.description,
    resumeUrl: resumeUrl ?? null,
    status: 1,
    createdBy: userId,
    updatedBy: userId
  });

  const jobWithRelations = await Job.findByPk(createdJob.id, {
    include: buildJobInclude()
  });

  return sendCreated(res, serializeJob(jobWithRelations ?? createdJob), "Job created successfully");
});

export const updateJob = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);

  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw new ApiError("Invalid job id", 400);
  }

  const job = await Job.findByPk(id, {
    include: buildJobInclude()
  });

  if (!job) {
    throw new ApiError("Job not found", 404);
  }

  const payload = await normalizeJobPayload(req, {
    existingJob: job,
    currentUserId: userId
  });
  const resumeUrl = extractResumeUrl(req);

  await job.update({
    submittedFor: payload.submittedFor,
    applicantUserId: payload.applicantUserId,
    fullName: payload.fullName,
    contactNumber: payload.contactNumber,
    email: payload.email,
    alternativeContactNumber: payload.alternativeContactNumber,
    fullAddress: payload.fullAddress,
    education: payload.education,
    workExperience: payload.workExperience,
    description: payload.description,
    resumeUrl: resumeUrl ?? job.resumeUrl,
    updatedBy: userId
  });

  await job.reload({ include: buildJobInclude() });

  return sendSuccess(res, serializeJob(job), "Job updated successfully");
});

export const deleteJob = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: userId } = requireAuthenticatedUser(req);

  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw new ApiError("Invalid job id", 400);
  }

  const job = await Job.findOne({ where: { id, status: 1 } });
  if (!job) {
    throw new ApiError("Job not found", 404);
  }

  await job.update({
    status: 0,
    updatedBy: userId
  });

  return sendNoContent(res);
});
