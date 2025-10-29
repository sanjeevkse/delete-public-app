import { Router } from "express";

import { createRole, deleteRole, listRoles, getRole, getRolePermissions, updateRole } from "../controllers/roleController";
import { listPermissions } from "../controllers/permissionController";
import { authorizePermissions } from "../middlewares/authorizationMiddleware";

const router = Router();

router.get("/", authorizePermissions("roles:list"), listRoles);
router.post("/", authorizePermissions("roles:create"), createRole);
router.get("/permissions", authorizePermissions("permissions:list"), listPermissions);
router.get("/:id", authorizePermissions("roles:list"), getRole);
router.get("/:id/permissions", authorizePermissions("roles:list"), getRolePermissions);
router.put("/:id", authorizePermissions("roles:update"), updateRole);
router.delete("/:id", authorizePermissions("roles:delete"), deleteRole);

export default router;
