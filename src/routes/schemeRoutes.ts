import { Router } from "express";

import {
  createScheme,
  deleteScheme,
  getScheme,
  listSchemes,
  updateScheme,
  updateSchemeStep
} from "../controllers/schemeController";
import { authenticate } from "../middlewares/authMiddleware";
import { authorizePermissions } from "../middlewares/authorizationMiddleware";

const router = Router();

router.get("/schemes", authenticate(), listSchemes);
router.get("/schemes/:id", authenticate(), getScheme);
router.post("/schemes", authenticate(), createScheme);
router.put("/schemes/:id", authenticate(), updateScheme);
router.put("/schemes/:schemeId/steps/:stepId", authenticate(), updateSchemeStep);
router.delete("/schemes/:id", authenticate(), deleteScheme);

export default router;
