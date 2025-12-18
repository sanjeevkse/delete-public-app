import {
  ALLOWED_MIME_TYPES,
  UPLOAD_COUNTS,
  UPLOAD_LIMITS,
  UPLOAD_MODULES,
  ASSET_TYPES
} from "../config/uploadConstants";
import { ApiError } from "./errorHandler";
import { createFileUploadMiddleware } from "./uploadMiddleware";

const ALLOWED_IMAGE_MIME_TYPES = ALLOWED_MIME_TYPES.IMAGES as unknown as string[];
const ALLOWED_VIDEO_MIME_TYPES = ALLOWED_MIME_TYPES.VIDEOS as unknown as string[];

export const MAX_POST_IMAGE_COUNT = UPLOAD_COUNTS.POST.MAX_IMAGES;
export const MAX_POST_VIDEO_COUNT = UPLOAD_COUNTS.POST.MAX_VIDEOS;
const POST_MEDIA_MAX_FILE_COUNT = UPLOAD_COUNTS.POST.MAX_TOTAL;

const POST_MEDIA_MAX_FILE_SIZE_BYTES = Math.max(
  UPLOAD_LIMITS.MAX_IMAGE_SIZE,
  UPLOAD_LIMITS.MAX_VIDEO_SIZE
);

const ALLOWED_MEDIA_MIME_TYPES = [...ALLOWED_IMAGE_MIME_TYPES, ...ALLOWED_VIDEO_MIME_TYPES];

const validatePostMediaFiles = (files: Express.Multer.File[]) => {
  let imageCount = 0;
  let videoCount = 0;

  for (const file of files) {
    if (ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      imageCount += 1;
    } else if (ALLOWED_VIDEO_MIME_TYPES.includes(file.mimetype)) {
      videoCount += 1;
    }
  }

  if (files.length > POST_MEDIA_MAX_FILE_COUNT) {
    throw new ApiError(`A post can include at most ${POST_MEDIA_MAX_FILE_COUNT} media files`, 400);
  }

  if (imageCount > MAX_POST_IMAGE_COUNT) {
    throw new ApiError(`A post can include at most ${MAX_POST_IMAGE_COUNT} images`, 400);
  }

  if (videoCount > MAX_POST_VIDEO_COUNT) {
    throw new ApiError(`A post can include at most ${MAX_POST_VIDEO_COUNT} video`, 400);
  }
};

export const postMediaUpload = createFileUploadMiddleware({
  fieldName: "media",
  maxCount: POST_MEDIA_MAX_FILE_COUNT,
  moduleName: UPLOAD_MODULES.POSTS,
  assetType: ASSET_TYPES.MEDIA,
  allowedMimeTypes: ALLOWED_MEDIA_MIME_TYPES,
  maxFileSizeBytes: POST_MEDIA_MAX_FILE_SIZE_BYTES,
  validateFiles: validatePostMediaFiles
});
// Form submission upload middleware
const ALLOWED_IMAGE_FILE_MIME_TYPES = [
  ...ALLOWED_IMAGE_MIME_TYPES,
  ...ALLOWED_VIDEO_MIME_TYPES,
  ...ALLOWED_MIME_TYPES.DOCUMENTS
];

const FORM_SUBMISSION_MAX_FILE_COUNT = UPLOAD_COUNTS.FORM_SUBMISSION.MAX_TOTAL;
const FORM_SUBMISSION_MAX_FILE_SIZE_BYTES = Math.max(
  UPLOAD_LIMITS.MAX_IMAGE_SIZE,
  UPLOAD_LIMITS.MAX_VIDEO_SIZE
);

const validateFormSubmissionFiles = (files: Express.Multer.File[]) => {
  let imageCount = 0;
  let videoCount = 0;
  let fileCount = 0;

  for (const file of files) {
    if (ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      imageCount += 1;
    } else if (ALLOWED_VIDEO_MIME_TYPES.includes(file.mimetype)) {
      videoCount += 1;
    } else if (ALLOWED_MIME_TYPES.DOCUMENTS.includes(file.mimetype)) {
      fileCount += 1;
    }
  }

  if (files.length > FORM_SUBMISSION_MAX_FILE_COUNT) {
    throw new ApiError(`Form can include at most ${FORM_SUBMISSION_MAX_FILE_COUNT} files`, 400);
  }

  if (imageCount > UPLOAD_COUNTS.FORM_SUBMISSION.MAX_IMAGES) {
    throw new ApiError(
      `Form can include at most ${UPLOAD_COUNTS.FORM_SUBMISSION.MAX_IMAGES} images`,
      400
    );
  }

  if (videoCount > UPLOAD_COUNTS.FORM_SUBMISSION.MAX_VIDEOS) {
    throw new ApiError(
      `Form can include at most ${UPLOAD_COUNTS.FORM_SUBMISSION.MAX_VIDEOS} videos`,
      400
    );
  }

  if (fileCount > UPLOAD_COUNTS.FORM_SUBMISSION.MAX_FILES) {
    throw new ApiError(
      `Form can include at most ${UPLOAD_COUNTS.FORM_SUBMISSION.MAX_FILES} files`,
      400
    );
  }
};

export const formSubmissionUpload = createFileUploadMiddleware({
  fieldName: "attachments",
  maxCount: FORM_SUBMISSION_MAX_FILE_COUNT,
  moduleName: UPLOAD_MODULES.FORM_SUBMISSIONS,
  assetType: ASSET_TYPES.MEDIA,
  allowedMimeTypes: ALLOWED_IMAGE_FILE_MIME_TYPES,
  maxFileSizeBytes: FORM_SUBMISSION_MAX_FILE_SIZE_BYTES,
  validateFiles: validateFormSubmissionFiles
});
