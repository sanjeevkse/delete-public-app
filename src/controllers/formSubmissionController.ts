import type { Request, Response } from "express";
import { Op, Transaction } from "sequelize";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { ApiError } from "../middlewares/errorHandler";
import asyncHandler from "../utils/asyncHandler";
import {
  sendCreated,
  sendSuccess,
  sendSuccessWithPagination,
  sendNotFound,
  parsePaginationParams,
  parseStatusFilter,
  parseSortDirection,
  validateSortColumn
} from "../utils/apiResponse";
import { assertNoRestrictedFields } from "../utils/payloadValidation";
import sequelize from "../config/database";
import FormSubmission from "../models/FormSubmission";
import FormFieldValue from "../models/FormFieldValue";
import FormEvent from "../models/FormEvent";
import Form from "../models/Form";
import FormField from "../models/FormField";
import User from "../models/User";
import UserProfile from "../models/UserProfile";

const DEFAULT_SORT_COLUMNS = ["submittedAt", "createdAt", "id"];

/**
 * Submit a form for a specific form event
 */
export const submitForm = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { formEventId } = req.params;
  let fieldValues = req.body.fieldValues;
  const userId = req.user?.id;
  const uploadedFiles = (req as any).files || [];

  // Parse fieldValues if it's a JSON string (from multipart form-data)
  if (typeof fieldValues === "string") {
    try {
      fieldValues = JSON.parse(fieldValues);
    } catch (e) {
      throw new ApiError("fieldValues must be a valid JSON array", 400);
    }
  }

  if (!userId) {
    throw new ApiError("Unauthorized", 401);
  }

  const formEventIdNum = Number(formEventId);
  if (!Number.isFinite(formEventIdNum) || formEventIdNum <= 0) {
    throw new ApiError("Invalid formEventId", 400);
  }

  if (!Array.isArray(fieldValues) || fieldValues.length === 0) {
    throw new ApiError("fieldValues must be a non-empty array", 400);
  }

  // Validate field values structure
  for (const fv of fieldValues) {
    if (!fv.formFieldId) {
      throw new ApiError("Each fieldValue must have formFieldId", 400);
    }
  }

  // Start transaction
  const transaction = await sequelize.transaction();

  try {
    // Check if form event exists and is active
    const formEvent = await FormEvent.findByPk(formEventIdNum, {
      include: [
        {
          model: Form,
          as: "form",
          include: [
            {
              model: FormField,
              as: "fields"
            }
          ]
        }
      ],
      transaction
    });

    if (!formEvent) {
      await transaction.rollback();
      throw new ApiError("Form event not found", 404);
    }

    if (formEvent.status !== 1) {
      await transaction.rollback();
      throw new ApiError("Form event is not active", 400);
    }

    // Check dates
    const today = new Date();
    const startDate = new Date(formEvent.startDate);
    const endDate = formEvent.endDate ? new Date(formEvent.endDate) : null;

    if (today < startDate) {
      await transaction.rollback();
      throw new ApiError("Form submission has not started yet", 400);
    }

    if (endDate && today > endDate) {
      await transaction.rollback();
      throw new ApiError("Form submission has ended", 400);
    }

    // Get form and fields for validation
    const form = formEvent.form;
    if (!form) {
      await transaction.rollback();
      throw new ApiError("Form not found", 404);
    }

    const formFields = form.fields || [];
    const fieldMap = new Map(formFields.map((f) => [f.id, f]));

    // Build file URL map for easy lookup by field ID
    const fileUrlsByFieldId = new Map<number, string[]>();
    for (const file of uploadedFiles) {
      const fieldId = Number(file.fieldvalue); // fieldvalue is passed as a form field
      if (fieldId) {
        if (!fileUrlsByFieldId.has(fieldId)) {
          fileUrlsByFieldId.set(fieldId, []);
        }
        // Store file URL/path
        const fileUrl = `${file.path}`;
        fileUrlsByFieldId.get(fieldId)!.push(fileUrl);
      }
    }

    // Validate each submitted field value
    for (const fv of fieldValues) {
      const field = fieldMap.get(fv.formFieldId);

      // Check field belongs to form
      if (!field) {
        throw new ApiError(`Field ID ${fv.formFieldId} does not belong to this form`, 400);
      }

      const value = fv.value ? String(fv.value).trim() : "";

      // Check required
      if (field.isRequired === 1 && !value && !fileUrlsByFieldId.has(fv.formFieldId)) {
        throw new ApiError(`Field "${field.label}" is required`, 400);
      }

      // Skip other validations if field is empty and optional
      if (!value && !fileUrlsByFieldId.has(fv.formFieldId)) continue;

      // Check min length
      if (field.minLength && value.length < field.minLength) {
        throw new ApiError(`"${field.label}" must be at least ${field.minLength} characters`, 400);
      }

      // Check max length
      if (field.maxLength && value.length > field.maxLength) {
        throw new ApiError(`"${field.label}" must not exceed ${field.maxLength} characters`, 400);
      }

      // Check regex pattern
      if (field.validationRegex && value) {
        const regex = new RegExp(field.validationRegex);
        if (!regex.test(value)) {
          throw new ApiError(`"${field.label}" format is invalid`, 400);
        }
      }

      // Check min/max value for numbers
      if (value) {
        const num = Number(value);
        if (!Number.isNaN(num)) {
          if (field.minValue && num < Number(field.minValue)) {
            throw new ApiError(`"${field.label}" must be at least ${field.minValue}`, 400);
          }
          if (field.maxValue && num > Number(field.maxValue)) {
            throw new ApiError(`"${field.label}" must not exceed ${field.maxValue}`, 400);
          }
        }
      }
    }

    // Create submission
    const submission = await FormSubmission.create(
      {
        formEventId: formEventIdNum,
        submittedBy: userId,
        submittedAt: new Date(),
        ipAddress: req.ip || null,
        userAgent: req.get("user-agent") || null,
        status: 1
      },
      { transaction }
    );

    // Create field values (including file URLs if any)
    const fieldValueRecords = fieldValues.map((fv: any) => {
      const field = fieldMap.get(fv.formFieldId)!;
      let finalValue = fv.value ? String(fv.value) : null;

      // If field has file uploads, include them (as JSON array or URL string)
      if (fileUrlsByFieldId.has(fv.formFieldId)) {
        const fileUrls = fileUrlsByFieldId.get(fv.formFieldId)!;
        finalValue = fileUrls.length === 1 ? fileUrls[0] : JSON.stringify(fileUrls);
      }

      return {
        formSubmissionId: submission.id,
        formFieldId: fv.formFieldId,
        fieldKey: field.fieldKey,
        value: finalValue
      };
    });

    await FormFieldValue.bulkCreate(fieldValueRecords, { transaction });

    await transaction.commit();

    // Fetch full submission with values
    const fullSubmission = await FormSubmission.findByPk(submission.id, {
      attributes: ["id", "formEventId", "submittedBy", "submittedAt", "ipAddress", "userAgent"],
      include: [
        {
          model: FormFieldValue,
          as: "fieldValues",
          attributes: ["id", "formFieldId", "fieldKey", "value"]
        },
        {
          model: FormEvent,
          as: "formEvent",
          attributes: ["id", "title", "formId"]
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "email"]
        }
      ]
    });

    sendCreated(res, fullSubmission, "Form submitted successfully");
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

/**
 * Get form submission by ID
 */
export const getFormSubmission = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { submissionId } = req.params;
  const userId = req.user?.id;

  const submissionIdNum = Number(submissionId);
  if (!Number.isFinite(submissionIdNum) || submissionIdNum <= 0) {
    throw new ApiError("Invalid submissionId", 400);
  }

  const submission = await FormSubmission.findByPk(submissionIdNum, {
    attributes: ["id", "formEventId", "submittedBy", "submittedAt", "ipAddress", "userAgent"],
    include: [
      {
        model: FormFieldValue,
        as: "fieldValues",
        attributes: ["id", "formFieldId", "fieldKey", "value"]
      },
      {
        model: FormEvent,
        as: "formEvent",
        include: [
          {
            model: Form,
            as: "form",
            include: [
              {
                model: FormField,
                as: "fields"
              }
            ]
          }
        ]
      },
      {
        model: User,
        as: "user",
        include: [
          {
            model: UserProfile,
            as: "profile"
          }
        ]
      }
    ],
    where: { status: { [Op.ne]: 0 } }
  });

  if (!submission) {
    return sendNotFound(res, "Form submission not found");
  }

  // Check authorization - user can view their own submissions; Admins can view all
  if (submission.submittedBy !== userId && !req.user?.roles.includes("admin")) {
    throw new ApiError("You don't have permission to view this submission", 403);
  }

  sendSuccess(res, submission);
});

/**
 * List form submissions for a form event
 */
export const listFormSubmissions = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { formEventId } = req.params;
    const {
      page = "1",
      limit = "25",
      status,
      sortBy = "submittedAt",
      sortOrder = "DESC"
    } = req.query;

    const formEventIdNum = Number(formEventId);
    if (!Number.isFinite(formEventIdNum) || formEventIdNum <= 0) {
      throw new ApiError("Invalid formEventId", 400);
    }

    // Parse pagination
    const {
      page: pageNum,
      limit: limitNum,
      offset
    } = parsePaginationParams(String(page), String(limit), 25, 100);

    // Validate sort column
    validateSortColumn(String(sortBy), DEFAULT_SORT_COLUMNS);
    const direction = parseSortDirection(String(sortOrder));

    // Build where clause
    const where: any = { formEventId: formEventIdNum, status: { [Op.ne]: 0 } };

    if (status) {
      const statusFilter = parseStatusFilter(String(status));
      where.status = statusFilter;
    }

    const { count, rows } = await FormSubmission.findAndCountAll({
      attributes: ["id", "formEventId", "submittedBy", "submittedAt", "ipAddress", "userAgent"],
      where,
      include: [
        {
          model: FormFieldValue,
          as: "fieldValues",
          attributes: ["id", "formFieldId", "fieldKey", "value"]
        },
        {
          model: User,
          as: "user",
          include: [
            {
              model: UserProfile,
              as: "profile"
            }
          ]
        }
      ],
      order: [[String(sortBy), direction]],
      limit: limitNum,
      offset,
      distinct: true
    });

    sendSuccessWithPagination(res, rows, {
      page: pageNum,
      limit: limitNum,
      total: count,
      totalPages: Math.ceil(count / limitNum)
    });
  }
);

/**
 * List user's own submissions
 */
export const listMySubmissions = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const {
    page = "1",
    limit = "25",
    status,
    sortBy = "submittedAt",
    sortOrder = "DESC"
  } = req.query;

  if (!userId) {
    throw new ApiError("Unauthorized", 401);
  }

  const {
    page: pageNum,
    limit: limitNum,
    offset
  } = parsePaginationParams(String(page), String(limit), 25, 100);

  validateSortColumn(String(sortBy), DEFAULT_SORT_COLUMNS);
  const direction = parseSortDirection(String(sortOrder));

  const where: any = { submittedBy: userId, status: { [Op.ne]: 0 } };

  if (status) {
    const statusFilter = parseStatusFilter(String(status));
    where.status = statusFilter;
  }

  const { count, rows } = await FormSubmission.findAndCountAll({
    attributes: ["id", "formEventId", "submittedBy", "submittedAt"],
    where,
    include: [
      {
        model: FormFieldValue,
        as: "fieldValues",
        attributes: ["id", "formFieldId", "fieldKey", "value"]
      },
      {
        model: FormEvent,
        as: "formEvent",
        attributes: ["id", "title", "formId"]
      }
    ],
    order: [[String(sortBy), direction]],
    limit: limitNum,
    offset,
    distinct: true
  });

  sendSuccessWithPagination(res, rows, {
    page: pageNum,
    limit: limitNum,
    total: count,
    totalPages: Math.ceil(count / limitNum)
  });
});

/**
 * Update submission status
 */
export const updateSubmissionStatus = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { submissionId } = req.params;
    const { status } = req.body;

    const submissionIdNum = Number(submissionId);
    if (!Number.isFinite(submissionIdNum) || submissionIdNum <= 0) {
      throw new ApiError("Invalid submissionId", 400);
    }

    if (status === undefined) {
      throw new ApiError("status is required", 400);
    }

    const statusNum = Number(status);
    if (!Number.isFinite(statusNum) || ![1, 2, 3].includes(statusNum)) {
      throw new ApiError("status must be 1 (submitted), 2 (reviewed), or 3 (rejected)", 400);
    }

    const submission = await FormSubmission.findByPk(submissionIdNum);
    if (!submission) {
      return sendNotFound(res, "Form submission not found");
    }

    await submission.update({
      status: statusNum
    });

    const updated = await FormSubmission.findByPk(submissionIdNum, {
      attributes: ["id", "formEventId", "submittedBy", "submittedAt", "ipAddress", "userAgent"]
    });

    sendSuccess(res, updated, "Submission status updated successfully");
  }
);

/**
 * Delete submission
 */
export const deleteFormSubmission = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { submissionId } = req.params;

    const submissionIdNum = Number(submissionId);
    if (!Number.isFinite(submissionIdNum) || submissionIdNum <= 0) {
      throw new ApiError("Invalid submissionId", 400);
    }

    const submission = await FormSubmission.findByPk(submissionIdNum);
    if (!submission) {
      return sendNotFound(res, "Form submission not found");
    }

    // Soft delete - mark as deleted
    await submission.update({
      status: 0
    });

    res.status(204).send();
  }
);

/**
 * Get submission stats for a form event
 */
export const getFormEventStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { formEventId } = req.params;

  const formEventIdNum = Number(formEventId);
  if (!Number.isFinite(formEventIdNum) || formEventIdNum <= 0) {
    throw new ApiError("Invalid formEventId", 400);
  }

  // Check if form event exists
  const formEvent = await FormEvent.findByPk(formEventIdNum);
  if (!formEvent) {
    return sendNotFound(res, "Form event not found");
  }

  const stats = await FormSubmission.findAll({
    attributes: [
      [sequelize.fn("COUNT", sequelize.col("id")), "totalSubmissions"],
      ["status", "status"]
    ],
    where: { formEventId: formEventIdNum, status: { [Op.ne]: 0 } },
    group: ["status"],
    raw: true
  });

  const result = {
    formEventId: formEventIdNum,
    totalSubmissions: 0,
    byStatus: {
      submitted: 0,
      reviewed: 0,
      rejected: 0
    }
  };

  for (const stat of stats) {
    const count = Number((stat as any).totalSubmissions);
    const statusVal = (stat as any).status;
    result.totalSubmissions += count;

    if (statusVal === 1) result.byStatus.submitted = count;
    if (statusVal === 2) result.byStatus.reviewed = count;
    if (statusVal === 3) result.byStatus.rejected = count;
  }

  sendSuccess(res, result);
});
