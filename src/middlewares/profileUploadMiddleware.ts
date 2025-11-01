import {
  ALLOWED_MIME_TYPES,
  UPLOAD_LIMITS,
  UPLOAD_MODULES,
  UPLOAD_COUNTS
} from "../config/uploadConstants";
import { createFileUploadMiddleware } from "./uploadMiddleware";

const ALLOWED_PROFILE_MIME_TYPES = ALLOWED_MIME_TYPES.IMAGES as unknown as string[];

export const profileImageUpload = createFileUploadMiddleware({
  fieldName: "profileImage",
  maxCount: UPLOAD_COUNTS.PROFILE.MAX_IMAGES,
  moduleName: UPLOAD_MODULES.PROFILE,
  assetType: "images",
  allowedMimeTypes: ALLOWED_PROFILE_MIME_TYPES,
  maxFileSizeBytes: UPLOAD_LIMITS.MAX_IMAGE_SIZE
});
