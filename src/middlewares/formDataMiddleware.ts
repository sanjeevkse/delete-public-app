import type { RequestHandler } from "express";
import multer from "multer";

const multerNone = multer().none();

// Wrap multer handler to avoid express type conflicts from nested @types
export const parseFormData: RequestHandler = (req, res, next) =>
  (multerNone as any)(req, res, next);
