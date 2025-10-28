import { Router } from "express";

import {
  createScheme,
  deleteScheme,
  getScheme,
  listSchemes,
  updateScheme
} from "../controllers/schemeController";
import { authenticate } from "../middlewares/authMiddleware";
import { authorizePermissions } from "../middlewares/authorizationMiddleware";

const router = Router();

router.get("/schemes", authenticate(), authorizePermissions("schemes:list"), listSchemes);
router.get("/schemes/:id", authenticate(), authorizePermissions("schemes:view"), getScheme);
router.post("/schemes", authenticate(), authorizePermissions("schemes:create"), createScheme);
router.put("/schemes/:id", authenticate(), authorizePermissions("schemes:update"), updateScheme);
router.delete("/schemes/:id", authenticate(), authorizePermissions("schemes:delete"), deleteScheme);

export default router;
