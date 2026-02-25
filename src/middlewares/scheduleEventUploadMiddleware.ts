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

export const MAX_SCHEDULE_EVENT_IMAGE_COUNT = UPLOAD_COUNTS.SCHEDULE_EVENT.MAX_IMAGES;
export const MAX_SCHEDULE_EVENT_VIDEO_COUNT = UPLOAD_COUNTS.SCHEDULE_EVENT.MAX_VIDEOS;
const SCHEDULE_EVENT_MEDIA_MAX_FILE_COUNT = UPLOAD_COUNTS.SCHEDULE_EVENT.MAX_TOTAL;

const SCHEDULE_EVENT_MEDIA_MAX_FILE_SIZE_BYTES = Math.max(
  UPLOAD_LIMITS.MAX_IMAGE_SIZE,
  UPLOAD_LIMITS.MAX_VIDEO_SIZE
);

const validateScheduleEventMediaFiles = (files: Express.Multer.File[]) => {
  let imageCount = 0;
  let videoCount = 0;

  for (const file of files) {
    if (ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      imageCount += 1;
    } else if (ALLOWED_VIDEO_MIME_TYPES.includes(file.mimetype)) {
      videoCount += 1;
    }
  }

  if (files.length > SCHEDULE_EVENT_MEDIA_MAX_FILE_COUNT) {
    throw new ApiError(
      `A schedule event can include at most ${SCHEDULE_EVENT_MEDIA_MAX_FILE_COUNT} media files`,
      400
    );
  }

  if (imageCount > MAX_SCHEDULE_EVENT_IMAGE_COUNT) {
    throw new ApiError(
      `A schedule event can include at most ${MAX_SCHEDULE_EVENT_IMAGE_COUNT} images`,
      400
    );
  }

  if (videoCount > MAX_SCHEDULE_EVENT_VIDEO_COUNT) {
    throw new ApiError(
      `A schedule event can include at most ${MAX_SCHEDULE_EVENT_VIDEO_COUNT} videos`,
      400
    );
  }
};

export const scheduleEventMediaUpload = createFileUploadMiddleware({
  fieldName: "media",
  maxCount: SCHEDULE_EVENT_MEDIA_MAX_FILE_COUNT,
  moduleName: UPLOAD_MODULES.SCHEDULE_EVENTS,
  assetType: ASSET_TYPES.MEDIA,
  allowedMimeTypes: [...ALLOWED_IMAGE_MIME_TYPES, ...ALLOWED_VIDEO_MIME_TYPES],
  maxFileSizeBytes: SCHEDULE_EVENT_MEDIA_MAX_FILE_SIZE_BYTES,
  validateFiles: validateScheduleEventMediaFiles
});
