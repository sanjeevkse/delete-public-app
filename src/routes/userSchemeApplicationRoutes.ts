import { Router } from "express";

import {
  createUserSchemeApplication,
  deleteUserSchemeApplication,
  getUserSchemeApplication,
  listUserSchemeApplications,
  updateUserSchemeApplication
} from "../controllers/userSchemeApplicationController";
import { authenticate } from "../middlewares/authMiddleware";
import { schemeApplicationDocumentUpload } from "../middlewares/schemeApplicationUploadMiddleware";

const router = Router();

router.get("/scheme-applications", authenticate(), listUserSchemeApplications);
router.get("/scheme-applications/:id", authenticate(), getUserSchemeApplication);
router.post(
  "/scheme-applications",
  authenticate(),
  schemeApplicationDocumentUpload,
  createUserSchemeApplication
);
router.put(
  "/scheme-applications/:id",
  authenticate(),
  schemeApplicationDocumentUpload,
  updateUserSchemeApplication
);
router.delete("/scheme-applications/:id", authenticate(), deleteUserSchemeApplication);

export default router;
