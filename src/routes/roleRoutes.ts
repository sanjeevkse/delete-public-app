import { Router } from "express";

import {
  createRole,
  deleteRole,
  listPermissions,
  listRoles,
  updateRole
} from "../controllers/roleController";
import { authorizePermissions } from "../middlewares/authorizationMiddleware";

const router = Router();

router.get("/", authorizePermissions("*"), listRoles);
router.post("/", authorizePermissions("*"), createRole);
router.get("/permissions", authorizePermissions("*"), listPermissions);
router.put("/:id", authorizePermissions("*"), updateRole);
router.delete("/:id", authorizePermissions("*"), deleteRole);

export default router;
