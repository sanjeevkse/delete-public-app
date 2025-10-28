import type { Request, Response } from "express";

import MetaPermission from "../models/MetaPermission";
import asyncHandler from "../utils/asyncHandler";
import { sendSuccess } from "../utils/apiResponse";

export const listPermissions = asyncHandler(async (_req: Request, res: Response) => {
  const permissions = await MetaPermission.findAll({
    include: [{ association: "group" }]
  });
  return sendSuccess(res, permissions, "Permissions retrieved successfully");
});
