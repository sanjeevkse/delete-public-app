import type { Express } from "express";

import {
  ALLOWED_MIME_TYPES,
  UPLOAD_COUNTS,
  UPLOAD_LIMITS,
  UPLOAD_MODULES,
  ASSET_TYPES
} from "../config/uploadConstants";
import { ApiError } from "./errorHandler";
import { createFileUploadMiddleware } from "./uploadMiddleware";

const ALLOWED_SPREADSHEET_MIME_TYPES = ALLOWED_MIME_TYPES.SPREADSHEETS as unknown as string[];

const EVENT_REGISTRATION_MAX_FILE_COUNT = UPLOAD_COUNTS.EVENT_REGISTRATION.MAX_FILES;

const validateRegistrationUpload = (files: Express.Multer.File[]) => {
  if (files.length > EVENT_REGISTRATION_MAX_FILE_COUNT) {
    throw new ApiError(
      `Event registration upload allows only ${EVENT_REGISTRATION_MAX_FILE_COUNT} file`,
      400
    );
  }
};

export const eventRegistrationUpload = createFileUploadMiddleware({
  fieldName: "file",
  maxCount: EVENT_REGISTRATION_MAX_FILE_COUNT,
  moduleName: UPLOAD_MODULES.EVENTS,
  assetType: ASSET_TYPES.REGISTRATIONS,
  allowedMimeTypes: ALLOWED_SPREADSHEET_MIME_TYPES,
  maxFileSizeBytes: UPLOAD_LIMITS.MAX_SPREADSHEET_SIZE,
  validateFiles: validateRegistrationUpload
});
