/* eslint-disable @typescript-eslint/no-explicit-any */
import type { RequestHandler } from "express";
import multer from "multer";
import path from "path";

import type { AuthenticatedRequest } from "./authMiddleware";
import { ApiError } from "./errorHandler";
import {
  resolveUploadDirectory,
  toRelativeUploadPath,
  toPublicUploadPath
} from "../utils/fileStorage";

export type UploadOptions = {
  fieldName: string;
  maxCount: number;
  moduleName: string;
  assetType: string;
  allowedMimeTypes: string[];
  maxFileSizeBytes: number;
  validateFiles?: (files: Express.Multer.File[], req: AuthenticatedRequest) => void;
  multipleFields?: boolean;
};

const sanitizeFileName = (originalName: string): string => {
  const ext = path.extname(originalName);
  const base = path.basename(originalName, ext);
  const safeBase = base.replace(/[^a-zA-Z0-9-_]/g, "-");
  return `${Date.now()}-${safeBase}${ext}`.toLowerCase();
};

export const createFileUploadMiddleware = (options: UploadOptions): RequestHandler => {
  const storage = multer.diskStorage({
    destination: (req: any, _file: any, cb: any) => {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;
      if (!userId) {
        return cb(new ApiError("Authentication required", 401));
      }

      try {
        const targetDir = resolveUploadDirectory(userId, options.moduleName, options.assetType);
        cb(null, targetDir);
      } catch (error) {
        cb(error as Error);
      }
    },
    filename: (_req: any, file: any, cb: any) => {
      cb(null, sanitizeFileName(file.originalname));
    }
  });

  const uploader = multer({
    storage,
    limits: {
      fileSize: options.maxFileSizeBytes
    },
    fileFilter: (_req: any, file: any, cb: any) => {
      if (!options.allowedMimeTypes.includes(file.mimetype)) {
        return cb(new ApiError("Unsupported file type", 400));
      }
      cb(null, true);
    }
  });

  const handler: RequestHandler = (req, res, next) => {
    const middleware = options.multipleFields
      ? uploader.any()
      : uploader.array(options.fieldName, options.maxCount);
    middleware(req as any, res as any, (err: any) => {
      if (err) {
        return next(err);
      }
      if (options.validateFiles) {
        try {
          const files = Array.isArray((req as any).files)
            ? ((req as any).files as Express.Multer.File[])
            : [];
          options.validateFiles(files, req as AuthenticatedRequest);
        } catch (validationError) {
          return next(validationError as Error);
        }
      }
      next();
    });
  };

  return handler;
};

export const buildPublicUploadPath = (absolutePath: string): string => {
  const relative = toRelativeUploadPath(absolutePath);
  return toPublicUploadPath(relative);
};
