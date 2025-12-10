import {
  ALLOWED_MIME_TYPES,
  UPLOAD_COUNTS,
  UPLOAD_LIMITS,
  UPLOAD_MODULES,
  ASSET_TYPES
} from "../config/uploadConstants";
import { ApiError } from "./errorHandler";
import { createFileUploadMiddleware } from "./uploadMiddleware";

// ✅ Allowed MIME types for complaint media
const ALLOWED_IMAGE_MIME_TYPES = ALLOWED_MIME_TYPES.IMAGES as unknown as string[];
const ALLOWED_VIDEO_MIME_TYPES = ALLOWED_MIME_TYPES.VIDEOS as unknown as string[];

// ✅ Complaint-specific upload limits
export const MAX_COMPLAINT_IMAGE_COUNT = UPLOAD_COUNTS.COMPLAINT?.MAX_IMAGES ?? 5;
export const MAX_COMPLAINT_VIDEO_COUNT = UPLOAD_COUNTS.COMPLAINT?.MAX_VIDEOS ?? 2;
const COMPLAINT_MEDIA_MAX_FILE_COUNT = UPLOAD_COUNTS.COMPLAINT?.MAX_TOTAL ?? 7;

// ✅ Max file size (based on whichever is higher — image or video)
const COMPLAINT_MEDIA_MAX_FILE_SIZE_BYTES = Math.max(
  UPLOAD_LIMITS.MAX_IMAGE_SIZE,
  UPLOAD_LIMITS.MAX_VIDEO_SIZE
);

// ✅ Combined allowed MIME types
const ALLOWED_MEDIA_MIME_TYPES = [...ALLOWED_IMAGE_MIME_TYPES, ...ALLOWED_VIDEO_MIME_TYPES];

// ✅ Validation function (same as for posts)
const validateComplaintMediaFiles = (files: Express.Multer.File[]) => {
  let imageCount = 0;
  let videoCount = 0;

  for (const file of files) {
    if (ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      imageCount += 1;
    } else if (ALLOWED_VIDEO_MIME_TYPES.includes(file.mimetype)) {
      videoCount += 1;
    }
  }

  if (files.length > COMPLAINT_MEDIA_MAX_FILE_COUNT) {
    throw new ApiError(
      `A complaint can include at most ${COMPLAINT_MEDIA_MAX_FILE_COUNT} media files`,
      400
    );
  }

  if (imageCount > MAX_COMPLAINT_IMAGE_COUNT) {
    throw new ApiError(`A complaint can include at most ${MAX_COMPLAINT_IMAGE_COUNT} images`, 400);
  }

  if (videoCount > MAX_COMPLAINT_VIDEO_COUNT) {
    throw new ApiError(`A complaint can include at most ${MAX_COMPLAINT_VIDEO_COUNT} videos`, 400);
  }
};

// ✅ Exported middleware
export const complaintMediaUpload = createFileUploadMiddleware({
  fieldName: "media",
  maxCount: COMPLAINT_MEDIA_MAX_FILE_COUNT,
  moduleName: UPLOAD_MODULES.COMPLAINTS, // 👈 separate folder for complaints
  assetType: ASSET_TYPES.MEDIA,
  allowedMimeTypes: ALLOWED_MEDIA_MIME_TYPES,
  maxFileSizeBytes: COMPLAINT_MEDIA_MAX_FILE_SIZE_BYTES,
  validateFiles: validateComplaintMediaFiles
});
