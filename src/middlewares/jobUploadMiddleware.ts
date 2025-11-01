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

const JOB_RESUME_ALLOWED_MIME_TYPES = ALLOWED_MIME_TYPES.DOCUMENTS as unknown as string[];

export const JOB_RESUME_MAX_FILE_COUNT = UPLOAD_COUNTS.JOB.MAX_RESUMES;
export const JOB_RESUME_MAX_FILE_SIZE_BYTES = UPLOAD_LIMITS.MAX_RESUME_SIZE;

const validateResumeFiles = (files: Express.Multer.File[]) => {
  if (files.length > JOB_RESUME_MAX_FILE_COUNT) {
    throw new ApiError("Only one resume file is allowed per job submission", 400);
  }
};

export const jobResumeUpload = createFileUploadMiddleware({
  fieldName: "resume",
  maxCount: JOB_RESUME_MAX_FILE_COUNT,
  moduleName: UPLOAD_MODULES.JOBS,
  assetType: ASSET_TYPES.RESUMES,
  allowedMimeTypes: JOB_RESUME_ALLOWED_MIME_TYPES,
  maxFileSizeBytes: JOB_RESUME_MAX_FILE_SIZE_BYTES,
  validateFiles: validateResumeFiles
});
