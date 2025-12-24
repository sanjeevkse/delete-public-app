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
        attributes: ["id", "fieldKey", "label"],
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
      }
    ],
    attributes: ["id", "submittedBy", "submittedAt"],
    order: [["submittedAt", "DESC"]]
  });

  // Prepare headers (field names)
  const formFields = form.fields || [];
  const headers = formFields.map((f) => f.label);

  // Prepare tabular data
  const tabularRows: (string | number | null)[][] = [];
  const numericColumns: boolean[] = [];

  // Determine which columns are numeric
  for (const field of formFields) {
    // You can enhance this by checking fieldTypeId against numeric types
    // For now, we'll try to detect based on the actual values
    numericColumns.push(false);
  }

  // Build data rows from submissions
  for (const submission of submissions) {
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
      const value = fieldValueMap.get(field.id) || null;

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
        row.push(null);
      }
    }

    tabularRows.push(row);
  }

  // Calculate footer (totals for numeric columns)
  const footer: (string | number | null)[] = [];
  for (let i = 0; i < formFields.length; i++) {
    if (numericColumns[i]) {
      // Sum numeric column
      let total = 0;
      for (const row of tabularRows) {
        const val = row[i];
        if (val !== null && typeof val === "number") {
          total += val;
        }
      }
      footer.push(total);
    } else {
      // Blank for non-numeric columns
      footer.push("");
    }
  }

  // Prepare metrics
  const metrics = {
    totalSubmissions
  };

  // Prepare tabular data object
  const tabularData = {
    headers,
    data: tabularRows,
    footer
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
