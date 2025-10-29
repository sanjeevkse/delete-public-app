import { Router } from "express";

import { createJob, deleteJob, getJob, listJobs, updateJob } from "../controllers/jobController";
import { authenticate } from "../middlewares/authMiddleware";
import { authorizePermissions } from "../middlewares/authorizationMiddleware";
import { jobResumeUpload } from "../middlewares/jobUploadMiddleware";

const router = Router();

router.get("/jobs", authenticate(), listJobs);
router.get("/jobs/:id", authenticate(), getJob);
router.post("/jobs", authenticate(), jobResumeUpload, createJob);
router.put("/jobs/:id", authenticate(), jobResumeUpload, updateJob);
router.delete("/jobs/:id", authenticate(), deleteJob);

export default router;
