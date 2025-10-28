import type { Express } from "express";

import { ApiError } from "./errorHandler";
import { createFileUploadMiddleware } from "./uploadMiddleware";

const JOB_RESUME_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

export const JOB_RESUME_MAX_FILE_COUNT = 1;
export const JOB_RESUME_MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

const validateResumeFiles = (files: Express.Multer.File[]) => {
  if (files.length > JOB_RESUME_MAX_FILE_COUNT) {
    throw new ApiError("Only one resume file is allowed per job submission", 400);
  }
};

export const jobResumeUpload = createFileUploadMiddleware({
  fieldName: "resume",
  maxCount: JOB_RESUME_MAX_FILE_COUNT,
  moduleName: "jobs",
  assetType: "resume",
  allowedMimeTypes: JOB_RESUME_ALLOWED_MIME_TYPES,
  maxFileSizeBytes: JOB_RESUME_MAX_FILE_SIZE_BYTES,
  validateFiles: validateResumeFiles
});
