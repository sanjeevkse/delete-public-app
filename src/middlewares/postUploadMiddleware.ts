import env from "../config/env";
import { createFileUploadMiddleware } from "./uploadMiddleware";

const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif"
];

export const postImagesUpload = createFileUploadMiddleware({
  fieldName: "images",
  maxCount: 10,
  moduleName: "posts",
  assetType: "images",
  allowedMimeTypes: ALLOWED_IMAGE_MIME_TYPES,
  maxFileSizeBytes: env.uploads.maxImageSizeBytes
});
