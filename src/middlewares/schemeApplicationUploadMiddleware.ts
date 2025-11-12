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

const ALLOWED_DOCUMENT_MIME_TYPES = [
  ...(ALLOWED_MIME_TYPES.DOCUMENTS as unknown as string[]),
  ...(ALLOWED_MIME_TYPES.IMAGES as unknown as string[]),
  ...(ALLOWED_MIME_TYPES.VIDEOS as unknown as string[])
];

const MAX_DOCUMENT_COUNT = UPLOAD_COUNTS.SCHEME_APPLICATION.MAX_DOCUMENTS;
const MAX_DOCUMENT_SIZE_BYTES = Math.max(
  UPLOAD_LIMITS.MAX_IMAGE_SIZE,
  UPLOAD_LIMITS.MAX_VIDEO_SIZE,
  UPLOAD_LIMITS.MAX_RESUME_SIZE
);

const validateDocumentFiles = (files: Express.Multer.File[]) => {
  if (files.length > MAX_DOCUMENT_COUNT) {
    throw new ApiError("Only one document can be uploaded per application", 400);
  }
};

export const schemeApplicationDocumentUpload = createFileUploadMiddleware({
  fieldName: "document",
  maxCount: MAX_DOCUMENT_COUNT,
  moduleName: UPLOAD_MODULES.SCHEME_APPLICATIONS,
  assetType: ASSET_TYPES.DOCUMENTS,
  allowedMimeTypes: ALLOWED_DOCUMENT_MIME_TYPES,
  maxFileSizeBytes: MAX_DOCUMENT_SIZE_BYTES,
  validateFiles: validateDocumentFiles
});

export default schemeApplicationDocumentUpload;
