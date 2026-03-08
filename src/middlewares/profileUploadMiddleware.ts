import {
  ALLOWED_MIME_TYPES,
  UPLOAD_LIMITS,
  UPLOAD_MODULES,
  UPLOAD_COUNTS
} from "../config/uploadConstants";
import { ApiError } from "./errorHandler";
import { createFileUploadMiddleware } from "./uploadMiddleware";

const ALLOWED_PROFILE_MIME_TYPES = ALLOWED_MIME_TYPES.IMAGES as unknown as string[];
const ALLOWED_PROFILE_DOCUMENT_MIME_TYPES = [
  ...(ALLOWED_MIME_TYPES.IMAGES as unknown as string[]),
  ...(ALLOWED_MIME_TYPES.DOCUMENTS as unknown as string[])
];

export const profileImageUpload = createFileUploadMiddleware({
  fieldName: "profileImage",
  maxCount: UPLOAD_COUNTS.PROFILE.MAX_IMAGES,
  moduleName: UPLOAD_MODULES.PROFILE,
  assetType: "images",
  allowedMimeTypes: ALLOWED_PROFILE_MIME_TYPES,
  maxFileSizeBytes: UPLOAD_LIMITS.MAX_IMAGE_SIZE
});

const PROFILE_DOCUMENT_UPLOAD_FIELDS = new Set(["voterIdPhoto", "aadhaarPhoto", "rationCardPhoto"]);

export const profileDocumentUpload = createFileUploadMiddleware({
  fieldName: "documents",
  maxCount: 3,
  moduleName: UPLOAD_MODULES.PROFILE,
  assetType: "documents",
  allowedMimeTypes: ALLOWED_PROFILE_DOCUMENT_MIME_TYPES,
  maxFileSizeBytes: UPLOAD_LIMITS.MAX_IMAGE_SIZE,
  multipleFields: true,
  validateFiles: (files) => {
    if (!files || files.length === 0) {
      return;
    }

    const seen = new Set<string>();
    for (const file of files) {
      if (!PROFILE_DOCUMENT_UPLOAD_FIELDS.has(file.fieldname)) {
        throw new ApiError(
          "Unsupported file field. Allowed fields: voterIdPhoto, aadhaarPhoto, rationCardPhoto",
          400
        );
      }

      if (seen.has(file.fieldname)) {
        throw new ApiError(`Only one file is allowed for ${file.fieldname}`, 400);
      }
      seen.add(file.fieldname);
    }
  }
});
