import env from "../config/env";
import { ApiError } from "./errorHandler";
import { createFileUploadMiddleware } from "./uploadMiddleware";

const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif"
];

const ALLOWED_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/3gpp",
  "video/x-msvideo",
  "video/x-matroska"
];

export const MAX_POST_IMAGE_COUNT = 4;
export const MAX_POST_VIDEO_COUNT = 1;
const POST_MEDIA_MAX_FILE_COUNT = MAX_POST_IMAGE_COUNT + MAX_POST_VIDEO_COUNT;

const POST_MEDIA_MAX_FILE_SIZE_BYTES = Math.min(
  5 * 1024 * 1024,
  env.uploads.maxImageSizeBytes,
  env.uploads.maxVideoSizeBytes
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
  moduleName: "posts",
  assetType: "media",
  allowedMimeTypes: ALLOWED_MEDIA_MIME_TYPES,
  maxFileSizeBytes: POST_MEDIA_MAX_FILE_SIZE_BYTES,
  validateFiles: validatePostMediaFiles
});
