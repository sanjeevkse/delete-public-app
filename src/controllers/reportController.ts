import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { ApiError } from "../middlewares/errorHandler";
import asyncHandler from "../utils/asyncHandler";
import { sendSuccess } from "../utils/apiResponse";
import FormEvent from "../models/FormEvent";
import FormSubmission from "../models/FormSubmission";
import FormFieldValue from "../models/FormFieldValue";
import Form from "../models/Form";
import FormField from "../models/FormField";
import FormFieldOption from "../models/FormFieldOption";
import User from "../models/User";
import UserProfile from "../models/UserProfile";

const DATE_FIELD_TYPES = new Set(["date"]);
const TIME_FIELD_TYPES = new Set(["time"]);
const DATETIME_FIELD_TYPES = new Set(["datetime"]);
const DATE_INPUT_FORMATS = new Set([7]);
const TIME_INPUT_FORMATS = new Set([8]);
const DATETIME_INPUT_FORMATS = new Set([9]);

const pad2 = (num: number) => String(num).padStart(2, "0");

const formatDateOnlyValue = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, yyyy, mm, dd] = match;
    return `${dd}-${mm}-${yyyy}`;
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return `${pad2(date.getDate())}-${pad2(date.getMonth() + 1)}-${date.getFullYear()}`;
};

const formatTimeOnlyValue = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (match) {
    const [, hh, mm, ss] = match;
    return `${hh}:${mm}:${ss ?? "00"}`;
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
};

const formatDateTimeValue = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const match = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/
  );
  if (match) {
    const [, yyyy, mm, dd, hh = "00", min = "00", ss = "00"] = match;
    return `${dd}-${mm}-${yyyy} ${hh}:${min}:${ss}`;
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return `${pad2(date.getDate())}-${pad2(date.getMonth() + 1)}-${date.getFullYear()} ${pad2(
    date.getHours()
  )}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
};

const formatValueByFieldType = (value: string, field: any): string | null => {
  const fieldType =
    typeof field?.fieldType?.fieldType === "string"
      ? field.fieldType.fieldType
      : undefined;
  const inputFormatId = field.inputFormatId ?? field.input_format_id;

  if ((fieldType && DATE_FIELD_TYPES.has(fieldType)) || DATE_INPUT_FORMATS.has(inputFormatId)) {
    return formatDateOnlyValue(value);
  }
  if ((fieldType && TIME_FIELD_TYPES.has(fieldType)) || TIME_INPUT_FORMATS.has(inputFormatId)) {
    return formatTimeOnlyValue(value);
  }
  if ((fieldType && DATETIME_FIELD_TYPES.has(fieldType)) || DATETIME_INPUT_FORMATS.has(inputFormatId)) {
    return formatDateTimeValue(value);
  }
  return null;
};

const formatDateTime = (value: Date | string | null | undefined): string | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const dd = pad2(date.getDate());
  const mm = pad2(date.getMonth() + 1);
  const yyyy = date.getFullYear();
  const hh = pad2(date.getHours());
  const min = pad2(date.getMinutes());
  const ss = pad2(date.getSeconds());
  return `${dd}-${mm}-${yyyy} ${hh}:${min}:${ss}`;
};

/**
 * Get form event report with details, metrics, and tabular data
 * GET /reports/form-events/:formEventId
 */
export const getFormEventReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { formEventId } = req.params;

  // Validate formEventId
  const formEventIdNum = Number(formEventId);
  if (!Number.isFinite(formEventIdNum) || formEventIdNum <= 0) {
    throw new ApiError("Invalid formEventId", 400);
  }

  // Check if form event exists
  const formEvent = await FormEvent.findByPk(formEventIdNum, {
    include: [
      {
        model: Form,
        as: "form",
        attributes: ["id", "title", "description"]
      }
    ]
  });

  if (!formEvent) {
    throw new ApiError("Form event not found", 404);
  }

  // Get form and all its fields
  const form = await Form.findByPk(formEvent.formId, {
    include: [
      {
        model: FormField,
        as: "fields",
        attributes: ["id", "fieldKey", "label", "fieldTypeId", "inputFormatId", "sortOrder"],
        include: [
          {
            association: "fieldType",
            attributes: ["id", "fieldType", "dispName"]
          },
          {
            model: FormFieldOption,
            as: "options",
            attributes: ["id", "fieldId", "optionLabel", "optionValue", "status"]
          }
        ],
        order: [["sortOrder", "ASC"]]
      }
    ]
  });

  if (!form) {
    throw new ApiError("Form not found", 404);
  }

  // Get total submissions count
  const totalSubmissions = await FormSubmission.count({
    where: {
      formEventId: formEventIdNum,
      status: 1
    }
  });

  // Get all submissions with their field values
  const submissions = await FormSubmission.findAll({
    where: {
      formEventId: formEventIdNum,
      status: 1
    },
    include: [
      {
        model: FormFieldValue,
        as: "fieldValues",
        attributes: ["formFieldId", "fieldKey", "value"]
      },
      {
        model: User,
        as: "user",
        attributes: ["id", "email"],
        include: [
          {
            model: UserProfile,
            as: "profile",
            attributes: ["displayName"]
          }
        ]
      }
    ],
    attributes: ["id", "submittedBy", "submittedAt"],
    order: [["submittedAt", "DESC"]]
  });

  // Prepare headers (field names)
  const formFields = (form.fields || []).slice().sort((a, b) => {
    const aOrder = typeof (a as any).sortOrder === "number" ? (a as any).sortOrder : 0;
    const bOrder = typeof (b as any).sortOrder === "number" ? (b as any).sortOrder : 0;
    return aOrder - bOrder;
  });
  const headers = ["SI No.", ...formFields.map((f) => f.label), "Created by", "Created date", "Actions"];

  // Prepare tabular data
  type TabularCell = string | number | null | { submissionId: number };
  const tabularRows: TabularCell[][] = [];
  const numericColumns: boolean[] = [];

  // Determine which columns are numeric
  for (const field of formFields) {
    // You can enhance this by checking fieldTypeId against numeric types
    // For now, we'll try to detect based on the actual values
    numericColumns.push(false);
  }

  const optionLabelLookup = new Map<number, Map<string, string>>();
  for (const field of formFields) {
    const options = (field as any).options || [];
    if (!Array.isArray(options) || options.length === 0) continue;
    const optionMap = new Map<string, string>();
    for (const option of options) {
      if (option?.status !== 1) continue;
      optionMap.set(String(option.id), option.optionLabel);
    }
    if (optionMap.size > 0) {
      optionLabelLookup.set(field.id, optionMap);
    }
  }

  // Build data rows from submissions
  for (let submissionIndex = 0; submissionIndex < submissions.length; submissionIndex++) {
    const submission = submissions[submissionIndex];
    const row: (string | number | null)[] = [];
    const fieldValueMap = new Map<number, string | null>();

    // Create map of fieldId -> value for quick lookup
    if (submission.fieldValues) {
      for (const fv of submission.fieldValues) {
        fieldValueMap.set(fv.formFieldId, fv.value);
      }
    }

    // Build row with values in field order
    for (let i = 0; i < formFields.length; i++) {
      const field = formFields[i];
      const value =
        fieldValueMap.has(field.id) ? fieldValueMap.get(field.id) ?? "" : "";
      const optionMap = optionLabelLookup.get(field.id);

      if (value && optionMap) {
        const trimmed = value.trim();
        if (trimmed.includes(",")) {
          const labels = trimmed
            .split(",")
            .map((entry) => entry.trim())
            .filter((entry) => entry.length > 0)
            .map((entry) => optionMap.get(entry))
            .filter((entry): entry is string => Boolean(entry));
          row.push(labels.join(", "));
          continue;
        }

        const label = optionMap.get(trimmed);
        if (label) {
          row.push(label);
          continue;
        }
      }

      if (value) {
        const formatted = formatValueByFieldType(value, field);
        if (formatted) {
          row.push(formatted);
          continue;
        }
      }

      // Try to convert to number if possible
      if (value) {
        const numValue = Number(value);
        if (!Number.isNaN(numValue)) {
          row.push(numValue);
          numericColumns[i] = true;
        } else {
          row.push(value);
        }
      } else {
        row.push("");
      }
    }

    const createdByLabel =
      submission.user?.profile?.displayName ||
      submission.user?.email ||
      (submission.submittedBy ? String(submission.submittedBy) : "");

    const fullRow: TabularCell[] = [
      submissionIndex + 1,
      ...row,
      createdByLabel,
      formatDateTime(submission.submittedAt),
      submission.id
    ];

    tabularRows.push(fullRow);
  }

  // Prepare metrics
  const metrics = {
    totalSubmissions
  };

  // Prepare tabular data object
  const tabularData = {
    headers,
    data: tabularRows
  };

  // Prepare response data
  const reportData = {
    formEvent: {
      id: formEvent.id,
      title: formEvent.title,
      description: formEvent.description,
      startDate: formEvent.startDate,
      endDate: formEvent.endDate,
      status: formEvent.status,
      form: formEvent.form
    },
    metrics,
    tabularData
  };

  sendSuccess(res, reportData, "Form event report retrieved successfully");
});

export default { getFormEventReport };
