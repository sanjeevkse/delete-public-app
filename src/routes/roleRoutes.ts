import { Router } from "express";

import {
  createRole,
  deleteRole,
  listRoles,
  getRole,
  getRolePermissions,
  updateRole
} from "../controllers/roleController";
import { listPermissions } from "../controllers/permissionController";
import { authorizePermissions } from "../middlewares/authorizationMiddleware";

const router = Router();

router.get("/", listRoles);
router.post("/", createRole);
router.get("/permissions", listPermissions);
router.get("/:id", getRole);
router.get("/:id/permissions", getRolePermissions);
router.put("/:id", updateRole);
router.delete("/:id", deleteRole);

export default router;
