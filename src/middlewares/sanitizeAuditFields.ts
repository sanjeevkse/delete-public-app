import type { NextFunction, Request, Response } from "express";

const AUDIT_FIELD_KEYS = new Set(["createdby", "createdat", "updatedby", "updatedat"]);

const sanitizeValue = (value: unknown): void => {
  if (!value || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach(sanitizeValue);
    return;
  }

  for (const key of Object.keys(value)) {
    const normalizedKey = key.replace(/[_-]/g, "").toLowerCase();

    if (AUDIT_FIELD_KEYS.has(normalizedKey)) {
      delete (value as Record<string, unknown>)[key];
      continue;
    }

    sanitizeValue((value as Record<string, unknown>)[key]);
  }
};

export const sanitizeAuditFields = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body && typeof req.body === "object") {
    sanitizeValue(req.body);
  }

  next();
};

export default sanitizeAuditFields;
