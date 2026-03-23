import type { Express, Request, Response } from "express";
import { Op } from "sequelize";
import type { Attributes, WhereOptions } from "sequelize";

import { ApiError } from "../middlewares/errorHandler";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { requireAuthenticatedUser } from "../middlewares/authMiddleware";
import FamilyMember from "../models/FamilyMember";
import MetaDisabilityStatus from "../models/MetaDisabilityStatus";
import MetaEducationalDetail from "../models/MetaEducationalDetail";
import MetaEducationalDetailGroup from "../models/MetaEducationalDetailGroup";
import MetaEmployment from "../models/MetaEmployment";
import MetaEmploymentGroup from "../models/MetaEmploymentGroup";
import MetaEmploymentStatus from "../models/MetaEmploymentStatus";
import MetaMaritalStatus from "../models/MetaMaritalStatus";
import MetaRelationType from "../models/MetaRelationType";
import User from "../models/User";
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
import { assertNoRestrictedFields } from "../utils/payloadValidation";
import { buildPublicUploadPath } from "../middlewares/uploadMiddleware";

const FAMILY_MEMBER_INCLUDE = [
  {
    model: User,
    as: "user",
    attributes: ["id", "fullName", "contactNumber", "email"]
  },
  {
    model: MetaRelationType,
    as: "relationType",
    attributes: ["id", "dispName", "description"]
  },
  { model: MetaDisabilityStatus, as: "disabilityStatus", attributes: ["id", "dispName"] },
  { model: MetaMaritalStatus, as: "maritalStatus", attributes: ["id", "dispName"] },
  {
    model: MetaEducationalDetailGroup,
    as: "educationalDetailGroup",
    attributes: ["id", "dispName"]
  },
  { model: MetaEducationalDetail, as: "educationalDetail", attributes: ["id", "dispName"] },
  { model: MetaEmploymentGroup, as: "employmentGroup", attributes: ["id", "dispName"] },
  { model: MetaEmploymentStatus, as: "employmentStatus", attributes: ["id", "dispName"] },
  { model: MetaEmployment, as: "employment", attributes: ["id", "dispName"] }
];

const parseRequiredPositiveInteger = (
  value: unknown,
  field: string,
  fieldErrors: Array<{ field: string; message: string }>
): number | null => {
  if (value === undefined || value === null || value === "") {
    fieldErrors.push({ field, message: `${field} is required` });
    return null;
  }
  const parsed =
    typeof value === "number" && Number.isFinite(value)
      ? value
      : typeof value === "string" && value.trim()
        ? Number.parseInt(value.trim(), 10)
        : Number.NaN;
  if (!Number.isInteger(parsed) || parsed <= 0) {
    fieldErrors.push({ field, message: `${field} must be a positive integer` });
    return null;
  }
  return parsed;
};

const parseOptionalPositiveInteger = (
  value: unknown,
  field: string,
  fieldErrors: Array<{ field: string; message: string }>
): number | null => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed =
    typeof value === "number" && Number.isFinite(value)
      ? value
      : typeof value === "string" && value.trim()
        ? Number.parseInt(value.trim(), 10)
        : Number.NaN;
  if (!Number.isInteger(parsed) || parsed <= 0) {
    fieldErrors.push({ field, message: `${field} must be a positive integer` });
    return null;
  }
  return parsed;
};

const parseOptionalString = (
  value: unknown,
  field: string,
  fieldErrors: Array<{ field: string; message: string }>
): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === "string") {
    return value.trim() || null;
  }
  if (typeof value === "number") {
    return String(value);
  }
  fieldErrors.push({ field, message: `${field} must be a string value` });
  return null;
};

const parseOptionalBoolean = (
  value: unknown,
  field: string,
  fieldErrors: Array<{ field: string; message: string }>
): boolean | null => {
  if (value === undefined || value === null || value === "") {
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
    if (["true", "1", "yes"].includes(normalized)) return true;
    if (["false", "0", "no"].includes(normalized)) return false;
  }
  fieldErrors.push({ field, message: `${field} must be a boolean` });
  return null;
};

const getUploadedFamilyMemberDocumentUrls = (
  req: Request
): Partial<Record<"aadhaarPhoto" | "voterIdProof" | "profilePhoto", string>> => {
  const uploadedFiles = Array.isArray((req as any).files)
    ? ((req as any).files as Express.Multer.File[])
    : [];
  if (uploadedFiles.length === 0) {
    return {};
  }

  const uploadedDocumentUrls: Partial<Record<"aadhaarPhoto" | "voterIdProof" | "profilePhoto", string>> = {};
  uploadedFiles.forEach((file) => {
    if (
      file.fieldname === "aadhaarPhoto" ||
      file.fieldname === "voterIdProof" ||
      file.fieldname === "profilePhoto"
    ) {
      uploadedDocumentUrls[file.fieldname] = buildPublicUploadPath(file.path);
    }
  });

  return uploadedDocumentUrls;
};

/**
 * List all family members with pagination and search
 * GET /api/family-members
 */
export const listFamilyMembers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { page, limit, offset } = parsePaginationParams(
    req.query.page as string,
    req.query.limit as string,
    25,
    100
  );
  const search = (req.query.search as string) ?? "";
  const status = req.query.status as string | undefined;
  const relationTypeId = req.query.relationTypeId as string;
  const { id: userId } = requireAuthenticatedUser(req);

  const filters: WhereOptions<Attributes<FamilyMember>>[] = [];

  if (search) {
    filters.push({
      [Op.or]: [
        { fullName: { [Op.like]: `%${search}%` } },
        { contactNumber: { [Op.like]: `%${search}%` } },
        { alternateContactNumber: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { voterIdNumber: { [Op.like]: `%${search}%` } },
        { aadhaarNumber: { [Op.like]: `%${search}%` } }
      ]
    });
  }

  if (status === undefined || status === null || status === "") {
    filters.push({ status: 1 });
  } else {
    const parsedStatus = Number.parseInt(status, 10);
    if (!Number.isNaN(parsedStatus)) {
      filters.push({ status: parsedStatus });
    }
  }

  filters.push({ userId });

  if (relationTypeId) {
    filters.push({ relationTypeId: Number.parseInt(relationTypeId, 10) });
  }

  const where: WhereOptions<Attributes<FamilyMember>> | undefined = filters.length
    ? { [Op.and]: filters }
    : undefined;

  const includeAuditFields = shouldIncludeAuditFields(req.query);
  const attributes = buildQueryAttributes({ includeAuditFields, keepFields: ["createdAt"] });

  const { rows, count } = await FamilyMember.findAndCountAll({
    where,
    attributes,
    include: FAMILY_MEMBER_INCLUDE,
    limit,
    offset,
    order: [["createdAt", "DESC"]]
  });

  const pagination = calculatePagination(count, page, limit);

  return sendSuccessWithPagination(res, rows, pagination, "Family members retrieved successfully");
});

/**
 * Get a single family member by ID
 * GET /api/family-members/:id
 */
export const getFamilyMember = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const includeInactive =
    req.query.includeInactive === "true" || req.query.includeInactive === "1";

  const includeAuditFields = shouldIncludeAuditFields(req.query);
  const attributes = buildQueryAttributes({ includeAuditFields, keepFields: ["status"] });

  const familyMember = await FamilyMember.findByPk(id, {
    attributes,
    include: FAMILY_MEMBER_INCLUDE
  });

  if (!familyMember || (!includeInactive && familyMember.status === 0)) {
    return sendNotFound(res, "Family member not found");
  }

  if (!includeAuditFields) {
    const { status: _status, ...payload } = familyMember.get({ plain: true });
    return sendSuccess(res, payload, "Family member retrieved successfully");
  }

  return sendSuccess(res, familyMember, "Family member retrieved successfully");
});

/**
 * Create a new family member
 * POST /api/family-members
 */
export const createFamilyMember = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  assertNoRestrictedFields(req.body);
  const uploadedDocumentUrls = getUploadedFamilyMemberDocumentUrls(req);

  const {
    userId,
    fullName,
    contactNumber,
    alternateContactNumber,
    email,
    instagram,
    facebook,
    fullAddress,
    aadhaarNumber,
    aadhaarPhoto,
    voterIdNumber,
    voterIdProof,
    profilePhoto,
    isVoter,
    relationTypeId,
    relationshipTypeId,
    relationshipName,
    disabilityStatusId,
    maritalStatusId,
    educationalDetailGroupId,
    educationalDetailId,
    employmentGroupId,
    employmentStatusId,
    employmentId
  } = req.body;
  const currentUserId = req.user?.id ?? null;

  const fieldErrors: Array<{ field: string; message: string }> = [];
  const relationTypeInput = relationshipTypeId ?? relationTypeId;

  const normalizedUserId =
    userId === undefined || userId === null || userId === ""
      ? currentUserId
      : parseRequiredPositiveInteger(userId, "userId", fieldErrors);

  if (!normalizedUserId) {
    fieldErrors.push({ field: "userId", message: "User ID is required" });
  }

  const normalizedFullName =
    typeof fullName === "string"
      ? fullName.trim()
      : typeof fullName === "number"
        ? String(fullName)
        : "";
  if (!normalizedFullName) {
    fieldErrors.push({ field: "fullName", message: "Full name is required" });
  }

  const normalizedRelationTypeId = parseRequiredPositiveInteger(
    relationTypeInput,
    "relationTypeId",
    fieldErrors
  );
  const normalizedContactNumber = parseOptionalString(contactNumber, "contactNumber", fieldErrors);
  const normalizedAlternateContactNumber = parseOptionalString(
    alternateContactNumber,
    "alternateContactNumber",
    fieldErrors
  );
  const normalizedEmail = parseOptionalString(email, "email", fieldErrors);
  const normalizedInstagram = parseOptionalString(instagram, "instagram", fieldErrors);
  const normalizedFacebook = parseOptionalString(facebook, "facebook", fieldErrors);
  const normalizedFullAddress = parseOptionalString(fullAddress, "fullAddress", fieldErrors);
  const normalizedAadhaarNumber = parseOptionalString(aadhaarNumber, "aadhaarNumber", fieldErrors);
  const normalizedAadhaarPhoto = parseOptionalString(
    uploadedDocumentUrls.aadhaarPhoto ?? aadhaarPhoto,
    "aadhaarPhoto",
    fieldErrors
  );
  const normalizedVoterIdNumber = parseOptionalString(voterIdNumber, "voterIdNumber", fieldErrors);
  const normalizedVoterIdProof = parseOptionalString(
    uploadedDocumentUrls.voterIdProof ?? voterIdProof,
    "voterIdProof",
    fieldErrors
  );
  const normalizedProfilePhoto = parseOptionalString(
    uploadedDocumentUrls.profilePhoto ?? profilePhoto,
    "profilePhoto",
    fieldErrors
  );
  const normalizedIsVoter = parseOptionalBoolean(isVoter, "isVoter", fieldErrors);
  const normalizedRelationshipName = parseOptionalString(
    relationshipName,
    "relationshipName",
    fieldErrors
  );
  const normalizedDisabilityStatusId = parseOptionalPositiveInteger(
    disabilityStatusId,
    "disabilityStatusId",
    fieldErrors
  );
  const normalizedMaritalStatusId = parseOptionalPositiveInteger(
    maritalStatusId,
    "maritalStatusId",
    fieldErrors
  );
  const normalizedEducationalDetailGroupId = parseOptionalPositiveInteger(
    educationalDetailGroupId,
    "educationalDetailGroupId",
    fieldErrors
  );
  const normalizedEducationalDetailId = parseOptionalPositiveInteger(
    educationalDetailId,
    "educationalDetailId",
    fieldErrors
  );
  const normalizedEmploymentGroupId = parseOptionalPositiveInteger(
    employmentGroupId,
    "employmentGroupId",
    fieldErrors
  );
  const normalizedEmploymentStatusId = parseOptionalPositiveInteger(
    employmentStatusId,
    "employmentStatusId",
    fieldErrors
  );
  const normalizedEmploymentId = parseOptionalPositiveInteger(
    employmentId,
    "employmentId",
    fieldErrors
  );

  if (normalizedAadhaarNumber && !/^\d{12}$/.test(normalizedAadhaarNumber)) {
    fieldErrors.push({
      field: "aadhaarNumber",
      message: "aadhaarNumber must be exactly 12 numeric digits"
    });
  }

  if (fieldErrors.length > 0) {
    throw new ApiError("Validation failed", 422, "VALIDATION_ERROR", fieldErrors);
  }

  // Verify user exists
  const user = normalizedUserId ? await User.findByPk(normalizedUserId) : null;
  if (!user) {
    fieldErrors.push({ field: "userId", message: "User not found" });
  }

  // Verify relation type exists
  const relationType = normalizedRelationTypeId
    ? await MetaRelationType.findByPk(normalizedRelationTypeId)
    : null;
  if (!relationType) {
    fieldErrors.push({ field: "relationTypeId", message: "Relation type not found" });
  }

  if (normalizedDisabilityStatusId) {
    const disabilityStatus = await MetaDisabilityStatus.findByPk(normalizedDisabilityStatusId);
    if (!disabilityStatus) {
      fieldErrors.push({ field: "disabilityStatusId", message: "Disability status not found" });
    }
  }

  if (normalizedMaritalStatusId) {
    const maritalStatus = await MetaMaritalStatus.findByPk(normalizedMaritalStatusId);
    if (!maritalStatus) {
      fieldErrors.push({ field: "maritalStatusId", message: "Marital status not found" });
    }
  }

  if (normalizedEducationalDetailGroupId) {
    const educationalDetailGroup = await MetaEducationalDetailGroup.findByPk(
      normalizedEducationalDetailGroupId
    );
    if (!educationalDetailGroup) {
      fieldErrors.push({
        field: "educationalDetailGroupId",
        message: "Educational detail group not found"
      });
    }
  }

  if (normalizedEducationalDetailId) {
    const educationalDetail = await MetaEducationalDetail.findByPk(normalizedEducationalDetailId);
    if (!educationalDetail) {
      fieldErrors.push({ field: "educationalDetailId", message: "Educational detail not found" });
    }
  }

  if (normalizedEmploymentGroupId) {
    const employmentGroup = await MetaEmploymentGroup.findByPk(normalizedEmploymentGroupId);
    if (!employmentGroup) {
      fieldErrors.push({ field: "employmentGroupId", message: "Employment group not found" });
    }
  }

  if (normalizedEmploymentStatusId) {
    const employmentStatus = await MetaEmploymentStatus.findByPk(normalizedEmploymentStatusId);
    if (!employmentStatus) {
      fieldErrors.push({ field: "employmentStatusId", message: "Employment status not found" });
    }
  }

  if (normalizedEmploymentId) {
    const employment = await MetaEmployment.findByPk(normalizedEmploymentId);
    if (!employment) {
      fieldErrors.push({ field: "employmentId", message: "Employment not found" });
    }
  }

  if (fieldErrors.length > 0) {
    throw new ApiError("Validation failed", 422, "VALIDATION_ERROR", fieldErrors);
  }

  const familyMember = await FamilyMember.create({
    userId: normalizedUserId!,
    fullName: normalizedFullName,
    contactNumber: normalizedContactNumber,
    alternateContactNumber: normalizedAlternateContactNumber,
    email: normalizedEmail,
    instagram: normalizedInstagram,
    facebook: normalizedFacebook,
    fullAddress: normalizedFullAddress,
    aadhaarNumber: normalizedAadhaarNumber,
    aadhaarPhoto: normalizedAadhaarPhoto,
    voterIdNumber: normalizedVoterIdNumber,
    voterIdProof: normalizedVoterIdProof,
    profilePhoto: normalizedProfilePhoto,
    isVoter: normalizedIsVoter,
    relationTypeId: normalizedRelationTypeId!,
    relationshipName: normalizedRelationshipName,
    disabilityStatusId: normalizedDisabilityStatusId,
    maritalStatusId: normalizedMaritalStatusId,
    educationalDetailGroupId: normalizedEducationalDetailGroupId,
    educationalDetailId: normalizedEducationalDetailId,
    employmentGroupId: normalizedEmploymentGroupId,
    employmentStatusId: normalizedEmploymentStatusId,
    employmentId: normalizedEmploymentId,
    status: 1,
    createdBy: currentUserId,
    updatedBy: currentUserId
  });

  // Fetch the created family member with relations
  const createdFamilyMember = await FamilyMember.findByPk(familyMember.id, {
    include: FAMILY_MEMBER_INCLUDE
  });

  sendCreated(res, createdFamilyMember, "Family member created successfully");
});

/**
 * Update a family member
 * PUT /api/family-members/:id
 */
export const updateFamilyMember = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  assertNoRestrictedFields(req.body);
  const uploadedDocumentUrls = getUploadedFamilyMemberDocumentUrls(req);

  const {
    userId,
    fullName,
    contactNumber,
    alternateContactNumber,
    email,
    instagram,
    facebook,
    fullAddress,
    aadhaarNumber,
    aadhaarPhoto,
    voterIdNumber,
    voterIdProof,
    profilePhoto,
    isVoter,
    relationTypeId,
    relationshipTypeId,
    relationshipName,
    disabilityStatusId,
    maritalStatusId,
    educationalDetailGroupId,
    educationalDetailId,
    employmentGroupId,
    employmentStatusId,
    employmentId
  } = req.body;
  const currentUserId = req.user?.id;
  const relationTypeInput = relationshipTypeId ?? relationTypeId;

  const familyMember = await FamilyMember.findByPk(id);

  if (!familyMember) {
    return sendNotFound(res, "Family member not found");
  }

  const fieldErrors: Array<{ field: string; message: string }> = [];

  let normalizedUserId: number | undefined;
  if (userId !== undefined) {
    const parsed = parseRequiredPositiveInteger(userId, "userId", fieldErrors);
    if (parsed !== null) {
      normalizedUserId = parsed;
      if (parsed !== familyMember.userId) {
        const user = await User.findByPk(parsed);
        if (!user) {
          fieldErrors.push({ field: "userId", message: "User not found" });
        }
      }
    }
  }

  let normalizedRelationTypeId: number | undefined;
  if (relationTypeInput !== undefined) {
    const parsed = parseRequiredPositiveInteger(relationTypeInput, "relationTypeId", fieldErrors);
    if (parsed !== null) {
      normalizedRelationTypeId = parsed;
      if (parsed !== familyMember.relationTypeId) {
        const relationType = await MetaRelationType.findByPk(parsed);
        if (!relationType) {
          fieldErrors.push({ field: "relationTypeId", message: "Relation type not found" });
        }
      }
    }
  }

  let normalizedDisabilityStatusId: number | null | undefined;
  if (disabilityStatusId !== undefined) {
    normalizedDisabilityStatusId = parseOptionalPositiveInteger(
      disabilityStatusId,
      "disabilityStatusId",
      fieldErrors
    );
    if (normalizedDisabilityStatusId !== null) {
      const disabilityStatus = await MetaDisabilityStatus.findByPk(normalizedDisabilityStatusId);
      if (!disabilityStatus) {
        fieldErrors.push({ field: "disabilityStatusId", message: "Disability status not found" });
      }
    }
  }

  let normalizedMaritalStatusId: number | null | undefined;
  if (maritalStatusId !== undefined) {
    normalizedMaritalStatusId = parseOptionalPositiveInteger(
      maritalStatusId,
      "maritalStatusId",
      fieldErrors
    );
    if (normalizedMaritalStatusId !== null) {
      const maritalStatus = await MetaMaritalStatus.findByPk(normalizedMaritalStatusId);
      if (!maritalStatus) {
        fieldErrors.push({ field: "maritalStatusId", message: "Marital status not found" });
      }
    }
  }

  let normalizedEducationalDetailGroupId: number | null | undefined;
  if (educationalDetailGroupId !== undefined) {
    normalizedEducationalDetailGroupId = parseOptionalPositiveInteger(
      educationalDetailGroupId,
      "educationalDetailGroupId",
      fieldErrors
    );
    if (normalizedEducationalDetailGroupId !== null) {
      const educationalDetailGroup = await MetaEducationalDetailGroup.findByPk(
        normalizedEducationalDetailGroupId
      );
      if (!educationalDetailGroup) {
        fieldErrors.push({
          field: "educationalDetailGroupId",
          message: "Educational detail group not found"
        });
      }
    }
  }

  let normalizedEducationalDetailId: number | null | undefined;
  if (educationalDetailId !== undefined) {
    normalizedEducationalDetailId = parseOptionalPositiveInteger(
      educationalDetailId,
      "educationalDetailId",
      fieldErrors
    );
    if (normalizedEducationalDetailId !== null) {
      const educationalDetail = await MetaEducationalDetail.findByPk(normalizedEducationalDetailId);
      if (!educationalDetail) {
        fieldErrors.push({ field: "educationalDetailId", message: "Educational detail not found" });
      }
    }
  }

  let normalizedEmploymentGroupId: number | null | undefined;
  if (employmentGroupId !== undefined) {
    normalizedEmploymentGroupId = parseOptionalPositiveInteger(
      employmentGroupId,
      "employmentGroupId",
      fieldErrors
    );
    if (normalizedEmploymentGroupId !== null) {
      const employmentGroup = await MetaEmploymentGroup.findByPk(normalizedEmploymentGroupId);
      if (!employmentGroup) {
        fieldErrors.push({ field: "employmentGroupId", message: "Employment group not found" });
      }
    }
  }

  let normalizedEmploymentStatusId: number | null | undefined;
  if (employmentStatusId !== undefined) {
    normalizedEmploymentStatusId = parseOptionalPositiveInteger(
      employmentStatusId,
      "employmentStatusId",
      fieldErrors
    );
    if (normalizedEmploymentStatusId !== null) {
      const employmentStatus = await MetaEmploymentStatus.findByPk(normalizedEmploymentStatusId);
      if (!employmentStatus) {
        fieldErrors.push({ field: "employmentStatusId", message: "Employment status not found" });
      }
    }
  }

  let normalizedEmploymentId: number | null | undefined;
  if (employmentId !== undefined) {
    normalizedEmploymentId = parseOptionalPositiveInteger(
      employmentId,
      "employmentId",
      fieldErrors
    );
    if (normalizedEmploymentId !== null) {
      const employment = await MetaEmployment.findByPk(normalizedEmploymentId);
      if (!employment) {
        fieldErrors.push({ field: "employmentId", message: "Employment not found" });
      }
    }
  }

  if (fieldErrors.length > 0) {
    throw new ApiError("Validation failed", 422, "VALIDATION_ERROR", fieldErrors);
  }

  if (normalizedUserId !== undefined) familyMember.userId = normalizedUserId;
  if (fullName !== undefined) {
    const normalizedFullName = parseOptionalString(fullName, "fullName", fieldErrors);
    if (!normalizedFullName) {
      fieldErrors.push({ field: "fullName", message: "fullName cannot be empty" });
    } else {
      familyMember.fullName = normalizedFullName;
    }
  }
  if (contactNumber !== undefined) {
    familyMember.contactNumber = parseOptionalString(contactNumber, "contactNumber", fieldErrors);
  }
  if (alternateContactNumber !== undefined) {
    familyMember.alternateContactNumber = parseOptionalString(
      alternateContactNumber,
      "alternateContactNumber",
      fieldErrors
    );
  }
  if (email !== undefined) familyMember.email = parseOptionalString(email, "email", fieldErrors);
  if (instagram !== undefined) {
    familyMember.instagram = parseOptionalString(instagram, "instagram", fieldErrors);
  }
  if (facebook !== undefined) {
    familyMember.facebook = parseOptionalString(facebook, "facebook", fieldErrors);
  }
  if (fullAddress !== undefined) {
    familyMember.fullAddress = parseOptionalString(fullAddress, "fullAddress", fieldErrors);
  }
  if (aadhaarNumber !== undefined) {
    const normalizedAadhaarNumber = parseOptionalString(aadhaarNumber, "aadhaarNumber", fieldErrors);
    if (normalizedAadhaarNumber && !/^\d{12}$/.test(normalizedAadhaarNumber)) {
      fieldErrors.push({
        field: "aadhaarNumber",
        message: "aadhaarNumber must be exactly 12 numeric digits"
      });
    } else {
      familyMember.aadhaarNumber = normalizedAadhaarNumber;
    }
  }
  if (aadhaarPhoto !== undefined || uploadedDocumentUrls.aadhaarPhoto !== undefined) {
    familyMember.aadhaarPhoto = parseOptionalString(
      uploadedDocumentUrls.aadhaarPhoto ?? aadhaarPhoto,
      "aadhaarPhoto",
      fieldErrors
    );
  }
  if (voterIdNumber !== undefined) {
    familyMember.voterIdNumber = parseOptionalString(voterIdNumber, "voterIdNumber", fieldErrors);
  }
  if (voterIdProof !== undefined || uploadedDocumentUrls.voterIdProof !== undefined) {
    familyMember.voterIdProof = parseOptionalString(
      uploadedDocumentUrls.voterIdProof ?? voterIdProof,
      "voterIdProof",
      fieldErrors
    );
  }
  if (profilePhoto !== undefined || uploadedDocumentUrls.profilePhoto !== undefined) {
    familyMember.profilePhoto = parseOptionalString(
      uploadedDocumentUrls.profilePhoto ?? profilePhoto,
      "profilePhoto",
      fieldErrors
    );
  }
  if (isVoter !== undefined) {
    familyMember.isVoter = parseOptionalBoolean(isVoter, "isVoter", fieldErrors);
  }
  if (normalizedRelationTypeId !== undefined) familyMember.relationTypeId = normalizedRelationTypeId;
  if (relationshipName !== undefined) {
    familyMember.relationshipName = parseOptionalString(
      relationshipName,
      "relationshipName",
      fieldErrors
    );
  }
  if (normalizedDisabilityStatusId !== undefined) {
    familyMember.disabilityStatusId = normalizedDisabilityStatusId;
  }
  if (normalizedMaritalStatusId !== undefined) {
    familyMember.maritalStatusId = normalizedMaritalStatusId;
  }
  if (normalizedEducationalDetailGroupId !== undefined) {
    familyMember.educationalDetailGroupId = normalizedEducationalDetailGroupId;
  }
  if (normalizedEducationalDetailId !== undefined) {
    familyMember.educationalDetailId = normalizedEducationalDetailId;
  }
  if (normalizedEmploymentGroupId !== undefined) {
    familyMember.employmentGroupId = normalizedEmploymentGroupId;
  }
  if (normalizedEmploymentStatusId !== undefined) {
    familyMember.employmentStatusId = normalizedEmploymentStatusId;
  }
  if (normalizedEmploymentId !== undefined) {
    familyMember.employmentId = normalizedEmploymentId;
  }

  if (fieldErrors.length > 0) {
    throw new ApiError("Validation failed", 422, "VALIDATION_ERROR", fieldErrors);
  }

  if (currentUserId) familyMember.updatedBy = currentUserId;

  await familyMember.save();

  // Fetch updated family member with relations
  const updatedFamilyMember = await FamilyMember.findByPk(id, {
    include: FAMILY_MEMBER_INCLUDE
  });

  sendSuccess(res, updatedFamilyMember, "Family member updated successfully");
});

/**
 * Delete a family member
 * DELETE /api/family-members/:id
 */
export const deleteFamilyMember = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const currentUserId = req.user?.id;

  const familyMember = await FamilyMember.findByPk(id);

  if (!familyMember) {
    return sendNotFound(res, "Family member not found");
  }

  await FamilyMember.update(
    {
      status: 0,
      ...(currentUserId ? { updatedBy: currentUserId } : {})
    },
    { where: { id: familyMember.id } }
  );

  sendNoContent(res);
});

/**
 * Toggle family member status (activate/deactivate)
 * PATCH /api/family-members/:id/status
 */
export const toggleFamilyMemberStatus = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user?.id;

    const familyMember = await FamilyMember.findByPk(id);

    if (!familyMember) {
      return sendNotFound(res, "Family member not found");
    }

    if (status === undefined) {
      throw new ApiError("Status field is required", 400);
    }

    familyMember.status = status;
    if (userId) familyMember.updatedBy = userId;
    await familyMember.save();

    const updatedFamilyMember = await FamilyMember.findByPk(id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "fullName", "contactNumber", "email"]
        },
        {
          model: MetaRelationType,
          as: "relationType",
          attributes: ["id", "dispName", "description"]
        }
      ]
    });

    sendSuccess(res, updatedFamilyMember, "Family member status updated successfully");
  }
);
