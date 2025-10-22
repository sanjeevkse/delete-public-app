import type { Request, Response } from "express";

import MetaPermission from "../models/MetaPermission";
import asyncHandler from "../utils/asyncHandler";

export const listPermissions = asyncHandler(async (_req: Request, res: Response) => {
  const permissions = await MetaPermission.findAll();
  res.json(permissions);
});

