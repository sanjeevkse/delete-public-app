import env from "../config/env";
import { createFileUploadMiddleware } from "./uploadMiddleware";

const ALLOWED_PROFILE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif"
];

export const profileImageUpload = createFileUploadMiddleware({
  fieldName: "profileImage",
  maxCount: 1,
  moduleName: "profiles",
  assetType: "avatars",
  allowedMimeTypes: ALLOWED_PROFILE_MIME_TYPES,
  maxFileSizeBytes: env.uploads.maxImageSizeBytes
});
