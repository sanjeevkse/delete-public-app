/**
 * Upload configuration constants
 * Centralized file upload limits and settings
 */

import path from "path";

// Upload paths configuration
export const UPLOAD_PATHS = {
  // Base directory for file uploads (persistent storage outside app)
  BASE_DIR: "/var/www/uploads/public_app",
  // Public URL path prefix for accessing uploaded files
  PUBLIC_PATH: "/uploads"
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
