import { Router } from "express";

import {
  createJob,
  deleteJob,
  getJob,
  listJobs,
  updateJob
} from "../controllers/jobController";
import { authenticate } from "../middlewares/authMiddleware";
import { authorizePermissions } from "../middlewares/authorizationMiddleware";
import { jobResumeUpload } from "../middlewares/jobUploadMiddleware";

const router = Router();

router.get("/jobs", authenticate(), authorizePermissions("jobs:list"), listJobs);
router.get("/jobs/:id", authenticate(), authorizePermissions("jobs:view"), getJob);
router.post(
  "/jobs",
  authenticate(),
  authorizePermissions("jobs:create"),
  jobResumeUpload,
  createJob
);
router.put(
  "/jobs/:id",
  authenticate(),
  authorizePermissions("jobs:update"),
  jobResumeUpload,
  updateJob
);
router.delete("/jobs/:id", authenticate(), authorizePermissions("jobs:delete"), deleteJob);

export default router;
