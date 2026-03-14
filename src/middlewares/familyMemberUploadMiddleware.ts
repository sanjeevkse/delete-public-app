import { ALLOWED_MIME_TYPES, UPLOAD_LIMITS, UPLOAD_MODULES } from "../config/uploadConstants";
import { ApiError } from "./errorHandler";
import { createFileUploadMiddleware } from "./uploadMiddleware";

const ALLOWED_FAMILY_MEMBER_DOCUMENT_MIME_TYPES = ALLOWED_MIME_TYPES.IMAGES as unknown as string[];
const FAMILY_MEMBER_DOCUMENT_UPLOAD_FIELDS = new Set(["aadhaarPhoto", "voterIdProof"]);

export const familyMemberDocumentUpload = createFileUploadMiddleware({
  fieldName: "documents",
  maxCount: 2,
  moduleName: UPLOAD_MODULES.PROFILE,
  assetType: "documents",
  allowedMimeTypes: ALLOWED_FAMILY_MEMBER_DOCUMENT_MIME_TYPES,
  maxFileSizeBytes: UPLOAD_LIMITS.MAX_IMAGE_SIZE,
  multipleFields: true,
  validateFiles: (files) => {
    if (!files || files.length === 0) {
      return;
    }

    const seen = new Set<string>();
    for (const file of files) {
      if (!FAMILY_MEMBER_DOCUMENT_UPLOAD_FIELDS.has(file.fieldname)) {
        throw new ApiError(
          "Unsupported file field. Allowed fields: aadhaarPhoto, voterIdProof",
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
