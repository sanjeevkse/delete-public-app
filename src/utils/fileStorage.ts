import fs from "fs";
import path from "path";

import { UPLOAD_PATHS } from "../config/uploadConstants";

export const ensureDirectory = (dirPath: string): void => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

export const resolveUploadDirectory = (
  userId: number,
  moduleName: string,
  assetType: string
): string => {
  const targetPath = path.join(UPLOAD_PATHS.BASE_DIR, String(userId), moduleName, assetType);
  ensureDirectory(targetPath);
  return targetPath;
};

export const toRelativeUploadPath = (absolutePath: string): string => {
  const relative = path.relative(UPLOAD_PATHS.BASE_DIR, absolutePath);
  return relative.split(path.sep).join("/");
};

export const toPublicUploadPath = (relativePath: string): string => {
  const trimmed = relativePath.startsWith("/") ? relativePath.slice(1) : relativePath;
  const base = UPLOAD_PATHS.PUBLIC_PATH.replace(/\/$/, "");
  return `${base}/${trimmed}`;
};
