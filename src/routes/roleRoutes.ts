import { Router } from "express";

import {
  createRole,
  deleteRole,
  listPermissions,
  listRoles,
  updateRole
} from "../controllers/roleController";

const router = Router();

router.get("/", listRoles);
router.post("/", createRole);
router.get("/permissions", listPermissions);
router.put("/:id", updateRole);
router.delete("/:id", deleteRole);

export default router;
