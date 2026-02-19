import {
  ALLOWED_MIME_TYPES,
  UPLOAD_COUNTS,
  UPLOAD_LIMITS,
  UPLOAD_MODULES
} from "../config/uploadConstants";
import { createFileUploadMiddleware } from "./uploadMiddleware";

const ALLOWED_BUSINESS_MIME_TYPES = ALLOWED_MIME_TYPES.IMAGES as unknown as string[];

export const businessPhotoUpload = createFileUploadMiddleware({
  fieldName: "photo",
  maxCount: UPLOAD_COUNTS.BUSINESS.MAX_IMAGES,
  moduleName: UPLOAD_MODULES.BUSINESSES,
  assetType: "images",
  allowedMimeTypes: ALLOWED_BUSINESS_MIME_TYPES,
  maxFileSizeBytes: UPLOAD_LIMITS.MAX_IMAGE_SIZE
});
