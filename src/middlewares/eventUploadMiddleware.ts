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

const ALLOWED_IMAGE_MIME_TYPES = ALLOWED_MIME_TYPES.IMAGES as unknown as string[];
const ALLOWED_VIDEO_MIME_TYPES = ALLOWED_MIME_TYPES.VIDEOS as unknown as string[];

export const MAX_EVENT_IMAGE_COUNT = UPLOAD_COUNTS.EVENT.MAX_IMAGES;
export const MAX_EVENT_VIDEO_COUNT = UPLOAD_COUNTS.EVENT.MAX_VIDEOS;
const EVENT_MEDIA_MAX_FILE_COUNT = UPLOAD_COUNTS.EVENT.MAX_TOTAL;

const EVENT_MEDIA_MAX_FILE_SIZE_BYTES = Math.max(
  UPLOAD_LIMITS.MAX_IMAGE_SIZE,
  UPLOAD_LIMITS.MAX_VIDEO_SIZE
);

const ALLOWED_MEDIA_MIME_TYPES = [...ALLOWED_IMAGE_MIME_TYPES, ...ALLOWED_VIDEO_MIME_TYPES];

const validateEventMediaFiles = (files: Express.Multer.File[]) => {
  let imageCount = 0;
  let videoCount = 0;

  for (const file of files) {
    if (ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      imageCount += 1;
    } else if (ALLOWED_VIDEO_MIME_TYPES.includes(file.mimetype)) {
      videoCount += 1;
    }
  }

  if (files.length > EVENT_MEDIA_MAX_FILE_COUNT) {
    throw new ApiError(
      `An event can include at most ${EVENT_MEDIA_MAX_FILE_COUNT} media files`,
      400
    );
  }

  if (imageCount > MAX_EVENT_IMAGE_COUNT) {
    throw new ApiError(`An event can include at most ${MAX_EVENT_IMAGE_COUNT} images`, 400);
  }

  if (videoCount > MAX_EVENT_VIDEO_COUNT) {
    throw new ApiError(`An event can include at most ${MAX_EVENT_VIDEO_COUNT} video`, 400);
  }
};

export const eventMediaUpload = createFileUploadMiddleware({
  fieldName: "media",
  maxCount: EVENT_MEDIA_MAX_FILE_COUNT,
  moduleName: UPLOAD_MODULES.EVENTS,
  assetType: ASSET_TYPES.MEDIA,
  allowedMimeTypes: ALLOWED_MEDIA_MIME_TYPES,
  maxFileSizeBytes: EVENT_MEDIA_MAX_FILE_SIZE_BYTES,
  validateFiles: validateEventMediaFiles
});
