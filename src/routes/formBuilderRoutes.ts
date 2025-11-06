import { Router } from "express";

import {
  createForm,
  createFormField,
  createFormFieldOption,
  createMetaFieldType,
  createMetaInputFormat,
  deleteForm,
  deleteFormField,
  deleteFormFieldOption,
  deleteMetaFieldType,
  deleteMetaInputFormat,
  getForm,
  getFormField,
  getFormFieldOption,
  getMetaFieldType,
  getMetaInputFormat,
  listFormFieldOptions,
  listFormFields,
  listForms,
  listMetaFieldTypes,
  listMetaInputFormats,
  updateForm,
  updateFormField,
  updateFormFieldOption,
  updateMetaFieldType,
  updateMetaInputFormat
} from "../controllers/formBuilderController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

/**
 * Field type routes
 */
router.get("/form-field-types", listMetaFieldTypes);
router.get("/form-field-types/:id", getMetaFieldType);
router.post("/form-field-types", authenticate(), createMetaFieldType);
router.put("/form-field-types/:id", authenticate(), updateMetaFieldType);
router.delete("/form-field-types/:id", authenticate(), deleteMetaFieldType);

/**
 * Input format routes
 */
router.get("/form-input-formats", listMetaInputFormats);
router.get("/form-input-formats/:id", getMetaInputFormat);
router.post("/form-input-formats", authenticate(), createMetaInputFormat);
router.put("/form-input-formats/:id", authenticate(), updateMetaInputFormat);
router.delete("/form-input-formats/:id", authenticate(), deleteMetaInputFormat);

/**
 * Form routes
 */
router.get("/forms", listForms);
router.get("/forms/:id", getForm);
router.post("/forms", authenticate(), createForm);
router.put("/forms/:id", authenticate(), updateForm);
router.delete("/forms/:id", authenticate(), deleteForm);

/**
 * Form field routes
 */
router.get("/forms/:formId/fields", listFormFields);
router.get("/forms/:formId/fields/:fieldId", getFormField);
router.post("/forms/:formId/fields", authenticate(), createFormField);
router.put("/forms/:formId/fields/:fieldId", authenticate(), updateFormField);
router.delete("/forms/:formId/fields/:fieldId", authenticate(), deleteFormField);

/**
 * Field option routes
 */
router.get("/forms/:formId/fields/:fieldId/options", listFormFieldOptions);
router.get("/forms/:formId/fields/:fieldId/options/:optionId", getFormFieldOption);
router.post("/forms/:formId/fields/:fieldId/options", authenticate(), createFormFieldOption);
router.put(
  "/forms/:formId/fields/:fieldId/options/:optionId",
  authenticate(),
  updateFormFieldOption
);
router.delete(
  "/forms/:formId/fields/:fieldId/options/:optionId",
  authenticate(),
  deleteFormFieldOption
);

export default router;
