import fs from "fs";
import path from "path";

import env from "../config/env";

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
  const targetPath = path.join(env.uploads.baseDir, String(userId), moduleName, assetType);
  ensureDirectory(targetPath);
  return targetPath;
};

export const toRelativeUploadPath = (absolutePath: string): string => {
  const relative = path.relative(env.uploads.baseDir, absolutePath);
  return relative.split(path.sep).join("/");
};

export const toPublicUploadPath = (relativePath: string): string => {
  const trimmed = relativePath.startsWith("/") ? relativePath.slice(1) : relativePath;
  const base = env.uploads.publicPath.replace(/\/$/, "");
  return `${base}/${trimmed}`;
};
