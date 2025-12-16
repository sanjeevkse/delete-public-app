import type { Request, Response } from "express";
import { Op, Transaction } from "sequelize";
import type { Attributes, IncludeOptions, WhereOptions } from "sequelize";

import { ApiError } from "../middlewares/errorHandler";
import asyncHandler from "../utils/asyncHandler";
import { assertNoRestrictedFields } from "../utils/payloadValidation";
import {
  calculatePagination,
  parsePaginationParams,
  sendCreated,
  sendNoContent,
  sendNotFound,
  sendSuccess,
  sendSuccessWithPagination,
  parseStatusFilter,
  parseSortDirection,
  validateSortColumn
} from "../utils/apiResponse";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import MetaFieldType from "../models/MetaFieldType";
import MetaInputFormat from "../models/MetaInputFormat";
import MetaWardNumber from "../models/MetaWardNumber";
import MetaBoothNumber from "../models/MetaBoothNumber";
import Form from "../models/Form";
import FormField from "../models/FormField";
import FormFieldOption from "../models/FormFieldOption";
import FormEvent from "../models/FormEvent";
import FormEventAccessibility from "../models/FormEventAccessibility";
import UserProfile from "../models/UserProfile";
import sequelize from "../config/database";

type PaginationQuery = {
  page?: string;
  limit?: string;
};

const paginate = (query: PaginationQuery, defaultLimit = 25, maxLimit = 100) => {
  const { page, limit, offset } = parsePaginationParams(
    query.page ?? "1",
    query.limit ?? String(defaultLimit),
    defaultLimit,
    maxLimit
  );

  return { page, limit, offset };
};

const parseBooleanLike = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  const normalized = String(value).toLowerCase();
  if (["1", "true", "yes"].includes(normalized)) {
    return 1;
  }
  if (["0", "false", "no"].includes(normalized)) {
    return 0;
  }

  return undefined;
};

const ensureBooleanLike = (value: unknown, fieldName: string): number => {
  const parsed = parseBooleanLike(value);
  if (parsed === undefined) {
    throw new ApiError(`Invalid ${fieldName} value`, 400);
  }
  return parsed;
};

const ensureNumber = (value: unknown, fieldName: string): number => {
  const num = Number(value);
  if (Number.isNaN(num)) {
    throw new ApiError(`Invalid ${fieldName} value`, 400);
  }
  return num;
};

const ensureDateOrNull = (value: unknown, fieldName: string): Date | null => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const date = new Date(value as string);
  if (Number.isNaN(date.valueOf())) {
    throw new ApiError(`Invalid ${fieldName} value`, 400);
  }
  return date;
};

const loadFormOrThrow = async (formId: string | number): Promise<Form> => {
  const form = await Form.findByPk(formId);
  if (!form) {
    throw new ApiError("Form not found", 404);
  }
  return form;
};

const loadFieldOrThrow = async (
  formId: string | number,
  fieldId: string | number
): Promise<FormField> => {
  const field = await FormField.findByPk(fieldId);
  if (!field || Number(field.formId) !== Number(formId)) {
    throw new ApiError("Form field not found", 404);
  }
  return field;
};

const loadOptionOrThrow = async (
  formId: string | number,
  fieldId: string | number,
  optionId: string | number
): Promise<FormFieldOption> => {
  const field = await loadFieldOrThrow(formId, fieldId);
  const option = await FormFieldOption.findByPk(optionId);
  if (!option || Number(option.fieldId) !== Number(field.id)) {
    throw new ApiError("Field option not found", 404);
  }
  return option;
};

const ensureFieldTypeExists = async (fieldTypeId: number): Promise<void> => {
  const fieldType = await MetaFieldType.findByPk(fieldTypeId);
  if (!fieldType) {
    throw new ApiError("Invalid fieldTypeId", 400);
  }
};

const ensureInputFormatExists = async (inputFormatId: number | null | undefined): Promise<void> => {
  if (inputFormatId === undefined || inputFormatId === null) {
    return;
  }
  const inputFormat = await MetaInputFormat.findByPk(inputFormatId);
  if (!inputFormat) {
    throw new ApiError("Invalid inputFormatId", 400);
  }
};

const normalizeJsonValue = (value: unknown): Record<string, unknown> | null => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  throw new ApiError("attrsJson must be an object", 400);
};

const normalizeOptionalString = (value: unknown, fieldName: string): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  throw new ApiError(`${fieldName} must be a string`, 400);
};

type FormFieldOptionInput = {
  optionLabel?: unknown;
  optionValue?: unknown;
  sortOrder?: unknown;
  isDefault?: unknown;
};

type FormFieldInput = {
  fieldKey?: unknown;
  label?: unknown;
  helpText?: unknown;
  fieldTypeId?: unknown;
  inputFormatId?: unknown;
  isRequired?: unknown;
  sortOrder?: unknown;
  placeholder?: unknown;
  defaultValue?: unknown;
  validationRegex?: unknown;
  minLength?: unknown;
  maxLength?: unknown;
  minValue?: unknown;
  maxValue?: unknown;
  attrsJson?: unknown;
  options?: unknown;
};

const createFormFieldsWithOptions = async (
  fieldsInput: FormFieldInput[],
  formId: number,
  userId: number | null,
  transaction: Transaction
): Promise<void> => {
  for (const rawField of fieldsInput) {
    if (!rawField || typeof rawField !== "object" || Array.isArray(rawField)) {
      throw new ApiError("Each field entry must be an object", 400);
    }

    const {
      fieldKey,
      label,
      helpText,
      fieldTypeId,
      inputFormatId,
      isRequired,
      sortOrder,
      placeholder,
      defaultValue,
      validationRegex,
      minLength,
      maxLength,
      minValue,
      maxValue,
      attrsJson,
      options
    } = rawField;

    if (!fieldKey || typeof fieldKey !== "string") {
      throw new ApiError("fieldKey is required for each field", 400);
    }
    if (!label || typeof label !== "string") {
      throw new ApiError("label is required for each field", 400);
    }
    if (fieldTypeId === undefined || fieldTypeId === null) {
      throw new ApiError("fieldTypeId is required for each field", 400);
    }

    const parsedFieldTypeId = ensureNumber(fieldTypeId, "fieldTypeId");
    await ensureFieldTypeExists(parsedFieldTypeId);

    let parsedInputFormatId: number | null = null;
    if (inputFormatId !== undefined && inputFormatId !== null && inputFormatId !== "") {
      parsedInputFormatId = ensureNumber(inputFormatId, "inputFormatId");
      await ensureInputFormatExists(parsedInputFormatId);
    }

    const isRequiredValue =
      isRequired !== undefined ? ensureBooleanLike(isRequired, "isRequired") : 0;
    const sortOrderValue = sortOrder !== undefined ? ensureNumber(sortOrder, "sortOrder") : 0;
    const minLengthValue =
      minLength !== undefined && minLength !== null ? ensureNumber(minLength, "minLength") : null;
    const maxLengthValue =
      maxLength !== undefined && maxLength !== null ? ensureNumber(maxLength, "maxLength") : null;
    const normalizedHelpText = normalizeOptionalString(helpText, "helpText");
    const normalizedPlaceholder = normalizeOptionalString(placeholder, "placeholder");
    const normalizedDefaultValue = normalizeOptionalString(defaultValue, "defaultValue");
    const normalizedValidationRegex = normalizeOptionalString(validationRegex, "validationRegex");

    if (options !== undefined && !Array.isArray(options)) {
      throw new ApiError("options must be an array when provided", 400);
    }

    const createdField = await FormField.create(
      {
        formId,
        fieldKey,
        label,
        helpText: normalizedHelpText,
        fieldTypeId: parsedFieldTypeId,
        inputFormatId: parsedInputFormatId,
        isRequired: isRequiredValue,
        sortOrder: sortOrderValue,
        placeholder: normalizedPlaceholder,
        defaultValue: normalizedDefaultValue,
        validationRegex: normalizedValidationRegex,
        minLength: minLengthValue,
        maxLength: maxLengthValue,
        minValue: minValue !== undefined && minValue !== null ? String(minValue) : null,
        maxValue: maxValue !== undefined && maxValue !== null ? String(maxValue) : null,
        attrsJson: normalizeJsonValue(attrsJson),
        createdBy: userId,
        updatedBy: userId
      },
      { transaction }
    );

    const optionInputs: FormFieldOptionInput[] = Array.isArray(options) ? options : [];
    for (const rawOption of optionInputs) {
      if (!rawOption || typeof rawOption !== "object" || Array.isArray(rawOption)) {
        throw new ApiError("Each field option must be an object", 400);
      }

      const { optionLabel, optionValue, sortOrder: optionSortOrder, isDefault } = rawOption;

      if (!optionLabel || typeof optionLabel !== "string") {
        throw new ApiError("optionLabel is required for each field option", 400);
      }
      if (!optionValue || typeof optionValue !== "string") {
        throw new ApiError("optionValue is required for each field option", 400);
      }

      const optionSortOrderValue =
        optionSortOrder !== undefined ? ensureNumber(optionSortOrder, "sortOrder") : 0;
      const optionIsDefaultValue =
        isDefault !== undefined ? ensureBooleanLike(isDefault, "isDefault") : 0;

      await FormFieldOption.create(
        {
          fieldId: createdField.id,
          optionLabel,
          optionValue,
          sortOrder: optionSortOrderValue,
          isDefault: optionIsDefaultValue,
          createdBy: userId,
          updatedBy: userId
        },
        { transaction }
      );
    }
  }
};

const formInclude: IncludeOptions[] = [
  {
    association: "fields",
    required: false,
    include: [
      {
        association: "options",
        required: false
      },
      {
        association: "fieldType",
        required: false,
        attributes: ["id", "fieldType", "dispName"]
      },
      {
        association: "inputFormat",
        required: false,
        attributes: ["id", "fieldType", "dispName", "targetValue"]
      }
    ]
  },
  {
    association: "events",
    required: false,
    include: [
      {
        association: "accessibility",
        required: false,
        include: [
          {
            association: "wardNumber",
            required: false,
            attributes: ["id", "dispName"]
          },
          {
            association: "boothNumber",
            required: false,
            attributes: ["id", "dispName"]
          },
          {
            association: "userRole",
            required: false,
            attributes: ["id", "dispName"]
          }
        ]
      }
    ]
  }
];

// Meta Field Type Handlers

export const listMetaFieldTypes = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = paginate(req.query);
  const sortDirection = parseSortDirection(req.query.sort, "DESC");
  const sortColumn = validateSortColumn(
    req.query.sortColumn,
    ["id", "fieldType", "dispName", "createdAt"],
    "createdAt"
  );
  const search = (req.query.search as string) ?? "";
  const status = parseStatusFilter(req.query.status);

  const filters: WhereOptions<Attributes<MetaFieldType>>[] = [];

  if (search) {
    filters.push({
      [Op.or]: [
        { fieldType: { [Op.like]: `%${search}%` } },
        { dispName: { [Op.like]: `%${search}%` } }
      ]
    });
  }

  if (status !== undefined && status !== null) {
    filters.push({ status });
  }

  const where: WhereOptions<Attributes<MetaFieldType>> | undefined =
    filters.length > 0 ? { [Op.and]: filters } : undefined;

  const { rows, count } = await MetaFieldType.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sortColumn, sortDirection]]
  });

  const pagination = calculatePagination(count, page, limit);

  sendSuccessWithPagination(res, rows, pagination, "Field types retrieved successfully");
});

export const getMetaFieldType = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const fieldType = await MetaFieldType.findByPk(id);

  if (!fieldType) {
    return sendNotFound(res, "Field type not found");
  }

  sendSuccess(res, fieldType, "Field type retrieved successfully");
});

export const createMetaFieldType = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    assertNoRestrictedFields(req.body);

    const { fieldType, dispName, description } = req.body;
    const userId = req.user?.id ?? null;

    if (!fieldType || !dispName) {
      throw new ApiError("fieldType and dispName are required", 400);
    }

    const payload = {
      fieldType,
      dispName,
      description: description ?? null,
      createdBy: userId,
      updatedBy: userId
    };

    const created = await MetaFieldType.create(payload);

    sendCreated(res, created, "Field type created successfully");
  }
);

export const updateMetaFieldType = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    assertNoRestrictedFields(req.body);
    const { id } = req.params;
    const fieldType = await MetaFieldType.findByPk(id);

    if (!fieldType) {
      return sendNotFound(res, "Field type not found");
    }

    const { fieldType: typeValue, dispName, description } = req.body;
    const userId = req.user?.id ?? null;

    if (typeValue !== undefined) {
      fieldType.fieldType = typeValue;
    }
    if (dispName !== undefined) {
      fieldType.dispName = dispName;
    }
    if (description !== undefined) {
      fieldType.description = description ?? null;
    }
    if (userId) {
      fieldType.updatedBy = userId;
    }

    await fieldType.save();

    sendSuccess(res, fieldType, "Field type updated successfully");
  }
);

export const deleteMetaFieldType = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const fieldType = await MetaFieldType.findByPk(id);

  if (!fieldType) {
    return sendNotFound(res, "Field type not found");
  }

  await fieldType.destroy();

  sendNoContent(res);
});

// Meta Input Format Handlers

export const listMetaInputFormats = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = paginate(req.query);
  const sortDirection = parseSortDirection(req.query.sort, "DESC");
  const sortColumn = validateSortColumn(
    req.query.sortColumn,
    ["id", "fieldType", "dispName", "targetValue", "createdAt"],
    "createdAt"
  );
  const search = (req.query.search as string) ?? "";
  const status = parseStatusFilter(req.query.status);
  const fieldType = (req.query.fieldType as string) ?? "";

  const filters: WhereOptions<Attributes<MetaInputFormat>>[] = [];

  if (search) {
    filters.push({
      [Op.or]: [
        { fieldType: { [Op.like]: `%${search}%` } },
        { dispName: { [Op.like]: `%${search}%` } },
        { targetValue: { [Op.like]: `%${search}%` } }
      ]
    });
  }

  if (status !== undefined && status !== null) {
    filters.push({ status });
  }

  if (fieldType) {
    filters.push({ fieldType });
  }

  const where: WhereOptions<Attributes<MetaInputFormat>> | undefined =
    filters.length > 0 ? { [Op.and]: filters } : undefined;

  const { rows, count } = await MetaInputFormat.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sortColumn, sortDirection]]
  });

  const pagination = calculatePagination(count, page, limit);

  sendSuccessWithPagination(res, rows, pagination, "Input formats retrieved successfully");
});

export const getMetaInputFormat = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const inputFormat = await MetaInputFormat.findByPk(id);

  if (!inputFormat) {
    return sendNotFound(res, "Input format not found");
  }

  sendSuccess(res, inputFormat, "Input format retrieved successfully");
});

export const createMetaInputFormat = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    assertNoRestrictedFields(req.body);

    const { fieldType, dispName, targetValue, description } = req.body;
    const userId = req.user?.id ?? null;

    if (!fieldType || !dispName || !targetValue) {
      throw new ApiError("fieldType, dispName and targetValue are required", 400);
    }

    const payload = {
      fieldType,
      dispName,
      targetValue,
      description: description ?? null,
      createdBy: userId,
      updatedBy: userId
    };

    const created = await MetaInputFormat.create(payload);

    sendCreated(res, created, "Input format created successfully");
  }
);

export const updateMetaInputFormat = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    assertNoRestrictedFields(req.body);
    const { id } = req.params;
    const inputFormat = await MetaInputFormat.findByPk(id);

    if (!inputFormat) {
      return sendNotFound(res, "Input format not found");
    }

    const { fieldType, dispName, targetValue, description } = req.body;
    const userId = req.user?.id ?? null;

    if (fieldType !== undefined) {
      inputFormat.fieldType = fieldType;
    }
    if (dispName !== undefined) {
      inputFormat.dispName = dispName;
    }
    if (targetValue !== undefined) {
      inputFormat.targetValue = targetValue;
    }
    if (description !== undefined) {
      inputFormat.description = description ?? null;
    }
    if (userId) {
      inputFormat.updatedBy = userId;
    }

    await inputFormat.save();

    sendSuccess(res, inputFormat, "Input format updated successfully");
  }
);

export const deleteMetaInputFormat = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const inputFormat = await MetaInputFormat.findByPk(id);

  if (!inputFormat) {
    return sendNotFound(res, "Input format not found");
  }

  await inputFormat.destroy();

  sendNoContent(res);
});

// Form Handlers

export const listForms = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { page, limit, offset } = paginate(req.query);
  const sortDirection = parseSortDirection(req.query.sort, "DESC");
  const sortColumn = validateSortColumn(
    req.query.sortColumn,
    ["id", "title", "slug", "createdAt"],
    "createdAt"
  );
  const search = (req.query.search as string) ?? "";
  const status = parseStatusFilter(req.query.status);
  // const isPublic = parseBooleanLike(req.query.isPublic);

  // const filters: WhereOptions<Attributes<Form>>[] = [];

  const userId = req.user?.id;
  if (!userId) {
    throw new ApiError("Authentication required", 401);
  }

  const userProfile = await UserProfile.findOne({
    where: { userId },
    attributes: ["wardNumberId", "boothNumberId"]
  });

  const wardNumberId = userProfile?.wardNumberId ?? null;
  const boothNumberId = userProfile?.boothNumberId ?? null;

  // if (search) {
  //   filters.push({
  //     [Op.or]: [{ title: { [Op.like]: `%${search}%` } }, { slug: { [Op.like]: `%${search}%` } }]
  //   });
  // }

  // if (status !== undefined && status !== null) {
  //   filters.push({ status });
  // }

  // if (isPublic !== undefined) {
  //   filters.push({ isPublic });
  // }

  // If user has both ward and booth numbers, filter by those mappings
  // Otherwise, show public forms or forms without specific mappings

  const { rows, count } = await Form.findAndCountAll({
    // where,
    limit,
    offset,
    include: formInclude,
    distinct: true,
    order: [
      [sortColumn, sortDirection],
      [{ model: FormField, as: "fields" }, "sortOrder", "ASC"],
      [
        { model: FormField, as: "fields" },
        { model: FormFieldOption, as: "options" },
        "sortOrder",
        "ASC"
      ]
    ]
  });

  const pagination = calculatePagination(count, page, limit);

  sendSuccessWithPagination(res, rows, pagination, "Forms retrieved successfully");
});

export const getForm = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const form = await Form.findByPk(id, {
    include: formInclude,
    order: [
      [{ model: FormField, as: "fields" }, "sortOrder", "ASC"],
      [
        { model: FormField, as: "fields" },
        { model: FormFieldOption, as: "options" },
        "sortOrder",
        "ASC"
      ]
    ]
  });

  if (!form) {
    return sendNotFound(res, "Form not found");
  }

  sendSuccess(res, form, "Form retrieved successfully");
});

export const createForm = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  assertNoRestrictedFields(req.body);

  const { title, description, slug, isPublic, startAt, endAt, fields, formFields } = req.body;
  const userId = req.user?.id ?? null;

  if (!title) {
    throw new ApiError("title is required", 400);
  }

  const isPublicValue = isPublic !== undefined ? ensureBooleanLike(isPublic, "isPublic") : 1;
  const startDate = ensureDateOrNull(startAt, "startAt");
  const endDate = ensureDateOrNull(endAt, "endAt");
  const fieldsInput = fields ?? formFields;
  const shouldProcessFields = Array.isArray(fieldsInput);

  if (fieldsInput !== undefined && fieldsInput !== null && !shouldProcessFields) {
    throw new ApiError("fields must be an array when provided", 400);
  }

  const normalizedFields: FormFieldInput[] = shouldProcessFields
    ? (fieldsInput as FormFieldInput[])
    : [];

  const form = await sequelize.transaction(async (transaction) => {
    const createdForm = await Form.create(
      {
        title,
        description: description ?? null,
        slug: slug ?? null,
        isPublic: isPublicValue,
        startAt: startDate,
        endAt: endDate,
        createdBy: userId,
        updatedBy: userId
      },
      { transaction }
    );

    if (normalizedFields.length > 0) {
      await createFormFieldsWithOptions(
        normalizedFields,
        createdForm.id,
        userId ?? null,
        transaction
      );
    }

    return createdForm;
  });

  const formWithFields =
    (await Form.findByPk(form.id, {
      include: formInclude,
      order: [
        [{ model: FormField, as: "fields" }, "sortOrder", "ASC"],
        [
          { model: FormField, as: "fields" },
          { model: FormFieldOption, as: "options" },
          "sortOrder",
          "ASC"
        ]
      ]
    })) ?? form;

  sendCreated(res, formWithFields, "Form created successfully");
});

export const updateForm = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  assertNoRestrictedFields(req.body);
  const { id } = req.params;
  const form = await Form.findByPk(id);

  if (!form) {
    return sendNotFound(res, "Form not found");
  }

  const {
    title,
    description,
    slug,
    isPublic,
    startAt,
    endAt,
    fields: _fields,
    formFields: _formFields
  } = req.body;

  const userId = req.user?.id ?? null;

  if (title !== undefined) {
    form.title = title;
  }
  if (description !== undefined) {
    form.description = description ?? null;
  }
  if (slug !== undefined) {
    form.slug = slug ?? null;
  }
  if (isPublic !== undefined) {
    form.isPublic = ensureBooleanLike(isPublic, "isPublic");
  }
  if (startAt !== undefined) {
    form.startAt = ensureDateOrNull(startAt, "startAt");
  }
  if (endAt !== undefined) {
    form.endAt = ensureDateOrNull(endAt, "endAt");
  }
  if (userId) {
    form.updatedBy = userId;
  }

  await form.save();

  sendSuccess(res, form, "Form updated successfully");
});

export const deleteForm = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const form = await Form.findByPk(id);

  if (!form) {
    return sendNotFound(res, "Form not found");
  }

  await form.destroy();

  sendNoContent(res);
});

// Form Field Handlers

export const listFormFields = asyncHandler(async (req: Request, res: Response) => {
  const { formId } = req.params;
  await loadFormOrThrow(formId);

  const fields = await FormField.findAll({
    where: { formId },
    include: [
      {
        association: "fieldType",
        required: false,
        attributes: ["id", "fieldType", "dispName"]
      },
      {
        association: "inputFormat",
        required: false,
        attributes: ["id", "fieldType", "dispName", "targetValue"]
      },
      {
        association: "options",
        required: false
      }
    ],
    order: [
      ["sortOrder", "ASC"],
      [{ model: FormFieldOption, as: "options" }, "sortOrder", "ASC"]
    ]
  });

  sendSuccess(res, fields, "Form fields retrieved successfully");
});

export const getFormField = asyncHandler(async (req: Request, res: Response) => {
  const { formId, fieldId } = req.params;
  await loadFormOrThrow(formId);

  const field = await FormField.findByPk(fieldId, {
    include: [
      {
        association: "fieldType",
        required: false,
        attributes: ["id", "fieldType", "dispName"]
      },
      {
        association: "inputFormat",
        required: false,
        attributes: ["id", "fieldType", "dispName", "targetValue"]
      },
      {
        association: "options",
        required: false
      }
    ],
    order: [[{ model: FormFieldOption, as: "options" }, "sortOrder", "ASC"]]
  });

  if (!field || Number(field.formId) !== Number(formId)) {
    return sendNotFound(res, "Form field not found");
  }

  sendSuccess(res, field, "Form field retrieved successfully");
});

export const createFormField = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  assertNoRestrictedFields(req.body);
  const { formId } = req.params;
  const form = await loadFormOrThrow(formId);
  const userId = req.user?.id ?? null;

  const {
    fieldKey,
    label,
    helpText,
    fieldTypeId,
    inputFormatId,
    isRequired,
    sortOrder,
    placeholder,
    defaultValue,
    validationRegex,
    minLength,
    maxLength,
    minValue,
    maxValue,
    attrsJson
  } = req.body;

  if (!fieldKey || !label || fieldTypeId === undefined || fieldTypeId === null) {
    throw new ApiError("fieldKey, label and fieldTypeId are required", 400);
  }

  const parsedFieldTypeId = ensureNumber(fieldTypeId, "fieldTypeId");
  await ensureFieldTypeExists(parsedFieldTypeId);

  let inputFormatValue: number | null = null;
  if (inputFormatId !== undefined && inputFormatId !== null) {
    inputFormatValue = ensureNumber(inputFormatId, "inputFormatId");
    await ensureInputFormatExists(inputFormatValue);
  }

  const isRequiredValue =
    isRequired !== undefined ? ensureBooleanLike(isRequired, "isRequired") : 0;
  const sortOrderValue = sortOrder !== undefined ? ensureNumber(sortOrder, "sortOrder") : 0;
  const minLengthValue =
    minLength !== undefined && minLength !== null ? ensureNumber(minLength, "minLength") : null;
  const maxLengthValue =
    maxLength !== undefined && maxLength !== null ? ensureNumber(maxLength, "maxLength") : null;

  const field = await FormField.create({
    formId: form.id,
    fieldKey,
    label,
    helpText: helpText ?? null,
    fieldTypeId: parsedFieldTypeId,
    inputFormatId: inputFormatValue,
    isRequired: isRequiredValue,
    sortOrder: sortOrderValue,
    placeholder: placeholder ?? null,
    defaultValue: defaultValue ?? null,
    validationRegex: validationRegex ?? null,
    minLength: minLengthValue,
    maxLength: maxLengthValue,
    minValue: minValue !== undefined ? String(minValue) : null,
    maxValue: maxValue !== undefined ? String(maxValue) : null,
    attrsJson: normalizeJsonValue(attrsJson),
    createdBy: userId,
    updatedBy: userId
  });

  sendCreated(res, field, "Form field created successfully");
});

export const updateFormField = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  assertNoRestrictedFields(req.body);
  const { formId, fieldId } = req.params;
  const field = await loadFieldOrThrow(formId, fieldId);
  const userId = req.user?.id ?? null;

  const {
    fieldKey,
    label,
    helpText,
    fieldTypeId,
    inputFormatId,
    isRequired,
    sortOrder,
    placeholder,
    defaultValue,
    validationRegex,
    minLength,
    maxLength,
    minValue,
    maxValue,
    attrsJson
  } = req.body;

  if (fieldTypeId !== undefined) {
    const parsed = ensureNumber(fieldTypeId, "fieldTypeId");
    await ensureFieldTypeExists(parsed);
    field.fieldTypeId = parsed;
  }

  if (inputFormatId !== undefined) {
    if (inputFormatId === null) {
      field.inputFormatId = null;
    } else {
      const parsed = ensureNumber(inputFormatId, "inputFormatId");
      await ensureInputFormatExists(parsed);
      field.inputFormatId = parsed;
    }
  }

  if (fieldKey !== undefined) field.fieldKey = fieldKey;
  if (label !== undefined) field.label = label;
  if (helpText !== undefined) field.helpText = helpText ?? null;
  if (isRequired !== undefined) {
    field.isRequired = ensureBooleanLike(isRequired, "isRequired");
  }
  if (sortOrder !== undefined) field.sortOrder = ensureNumber(sortOrder, "sortOrder");
  if (placeholder !== undefined) field.placeholder = placeholder ?? null;
  if (defaultValue !== undefined) field.defaultValue = defaultValue ?? null;
  if (validationRegex !== undefined) field.validationRegex = validationRegex ?? null;
  if (minLength !== undefined)
    field.minLength = minLength !== null ? ensureNumber(minLength, "minLength") : null;
  if (maxLength !== undefined)
    field.maxLength = maxLength !== null ? ensureNumber(maxLength, "maxLength") : null;
  if (minValue !== undefined) field.minValue = minValue !== null ? String(minValue) : null;
  if (maxValue !== undefined) field.maxValue = maxValue !== null ? String(maxValue) : null;
  if (attrsJson !== undefined) field.attrsJson = normalizeJsonValue(attrsJson);
  if (userId) field.updatedBy = userId;

  await field.save();

  sendSuccess(res, field, "Form field updated successfully");
});

export const deleteFormField = asyncHandler(async (req: Request, res: Response) => {
  const { formId, fieldId } = req.params;
  const field = await loadFieldOrThrow(formId, fieldId);
  await field.destroy();
  sendNoContent(res);
});

// Form Field Options

export const listFormFieldOptions = asyncHandler(async (req: Request, res: Response) => {
  const { formId, fieldId } = req.params;
  await loadFieldOrThrow(formId, fieldId);

  const options = await FormFieldOption.findAll({
    where: { fieldId },
    order: [["sortOrder", "ASC"]]
  });

  sendSuccess(res, options, "Field options retrieved successfully");
});

export const getFormFieldOption = asyncHandler(async (req: Request, res: Response) => {
  const { formId, fieldId, optionId } = req.params;
  await loadFormOrThrow(formId);

  const option = await FormFieldOption.findByPk(optionId);
  if (!option || Number(option.fieldId) !== Number(fieldId)) {
    return sendNotFound(res, "Field option not found");
  }

  sendSuccess(res, option, "Field option retrieved successfully");
});

export const createFormFieldOption = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    assertNoRestrictedFields(req.body);
    const { formId, fieldId } = req.params;
    const field = await loadFieldOrThrow(formId, fieldId);
    const userId = req.user?.id ?? null;

    const { optionLabel, optionValue, sortOrder, isDefault } = req.body;

    if (!optionLabel || !optionValue) {
      throw new ApiError("optionLabel and optionValue are required", 400);
    }

    const sortOrderValue = sortOrder !== undefined ? ensureNumber(sortOrder, "sortOrder") : 0;
    const isDefaultValue = isDefault !== undefined ? ensureBooleanLike(isDefault, "isDefault") : 0;

    const option = await FormFieldOption.create({
      fieldId: field.id,
      optionLabel,
      optionValue,
      sortOrder: sortOrderValue,
      isDefault: isDefaultValue,
      createdBy: userId,
      updatedBy: userId
    });

    sendCreated(res, option, "Field option created successfully");
  }
);

export const updateFormFieldOption = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    assertNoRestrictedFields(req.body);
    const { formId, fieldId, optionId } = req.params;
    const option = await loadOptionOrThrow(formId, fieldId, optionId);
    const userId = req.user?.id ?? null;

    const { optionLabel, optionValue, sortOrder, isDefault } = req.body;

    if (optionLabel !== undefined) option.optionLabel = optionLabel;
    if (optionValue !== undefined) option.optionValue = optionValue;
    if (sortOrder !== undefined) option.sortOrder = ensureNumber(sortOrder, "sortOrder");
    if (isDefault !== undefined) option.isDefault = ensureBooleanLike(isDefault, "isDefault");
    if (userId) option.updatedBy = userId;

    await option.save();

    sendSuccess(res, option, "Field option updated successfully");
  }
);

export const deleteFormFieldOption = asyncHandler(async (req: Request, res: Response) => {
  const { formId, fieldId, optionId } = req.params;
  const option = await loadOptionOrThrow(formId, fieldId, optionId);
  await option.destroy();
  sendNoContent(res);
});
