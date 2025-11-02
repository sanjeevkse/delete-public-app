/**
 * Upload configuration constants
 * Centralized file upload limits and settings
 */

import path from "path";

// Resolve upload storage location based on environment
const DEFAULT_PRODUCTION_UPLOAD_DIR = "/var/www/uploads/public_app";
const DEFAULT_DEVELOPMENT_UPLOAD_DIR = path.resolve(process.cwd(), "project/upload");

const resolveUploadBaseDir = (): string => {
  const explicitDir = process.env.UPLOAD_BASE_DIR?.trim();
  if (explicitDir) {
    return explicitDir;
  }

  const env = process.env.NODE_ENV ?? "development";
  return env === "production" ? DEFAULT_PRODUCTION_UPLOAD_DIR : DEFAULT_DEVELOPMENT_UPLOAD_DIR;
};

// Upload paths configuration
export const UPLOAD_PATHS = {
  // Base directory for file uploads (falls back to project/upload during local dev)
  BASE_DIR: resolveUploadBaseDir(),
  // Public URL path prefix for accessing uploaded files
  PUBLIC_PATH: "/uploads",
  // Full domain URL for uploaded files
  BASE_URL: "https://public.nammarajajinagar.com"
} as const;

// File size limits (in bytes)
export const UPLOAD_LIMITS = {
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5 MB
  MAX_VIDEO_SIZE: 50 * 1024 * 1024, // 50 MB
  MAX_RESUME_SIZE: 2 * 1024 * 1024 // 2 MB
} as const;

// Upload counts per module
export const UPLOAD_COUNTS = {
  POST: {
    MAX_IMAGES: 4,
    MAX_VIDEOS: 1,
    MAX_TOTAL: 5
  },
  EVENT: {
    MAX_IMAGES: 4,
    MAX_VIDEOS: 1,
    MAX_TOTAL: 5
  },
  PROFILE: {
    MAX_IMAGES: 1
  },
  JOB: {
    MAX_RESUMES: 1
  }
} as const;

// Allowed MIME types
export const ALLOWED_MIME_TYPES = {
  IMAGES: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"],
  VIDEOS: ["video/mp4", "video/quicktime", "video/3gpp", "video/x-msvideo", "video/x-matroska"],
  DOCUMENTS: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ]
} as const;

// Module names for file organization
export const UPLOAD_MODULES = {
  POSTS: "posts",
  EVENTS: "events",
  PROFILE: "profile",
  JOBS: "jobs"
} as const;

// Asset types within modules
export const ASSET_TYPES = {
  MEDIA: "media",
  IMAGES: "images",
  VIDEOS: "videos",
  RESUMES: "resumes"
} as const;
