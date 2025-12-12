import { Router } from "express";

import {
  createRole,
  deleteRole,
  listRoles,
  getRole,
  getRolePermissions,
  updateRole,
  assignPermissionToRole,
  removePermissionFromRole,
  getAllPermissionsGrouped
} from "../controllers/roleController";
import { listPermissions } from "../controllers/permissionController";
import { authorizePermissions } from "../middlewares/authorizationMiddleware";

const router = Router();

router.get("/", listRoles);
router.post("/", createRole);
router.get("/permissions", listPermissions);
router.get("/permissions/grouped/all", getAllPermissionsGrouped);
router.get("/:id", getRole);
router.get("/:id/permissions", getRolePermissions);
router.post("/:roleId/permissions", assignPermissionToRole);
router.delete("/:roleId/permissions/:permissionId", removePermissionFromRole);
router.put("/:id", updateRole);
router.delete("/:id", deleteRole);

export default router;
