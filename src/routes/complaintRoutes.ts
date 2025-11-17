import { Router } from "express";
import {
  createComplaint,
  getComplaintById,
  listComplaints,
  updateComplaint,
  deleteComplaint,
  addComplaintMedia,
  removeComplaintMedia
} from "../controllers/complaintController";
import { authenticate } from "../middlewares/authMiddleware";
import { complaintMediaUpload } from "../middlewares/complaintMediaUpload";

const router = Router();

// CREATE
router.post("/complaints", authenticate(), complaintMediaUpload, createComplaint);

// READ
router.get("/complaints", authenticate(), listComplaints);
router.get("/complaints/:id", authenticate(), getComplaintById);

// UPDATE
router.put("/complaints/:id", authenticate(), complaintMediaUpload, updateComplaint);

// DELETE (soft delete)
router.delete("/complaints/:id", authenticate(), deleteComplaint);

// Add media
router.post("/complaints/:id/media", authenticate(), complaintMediaUpload, addComplaintMedia);

// remove media
router.delete("/complaints/:id/media", authenticate(), removeComplaintMedia);

export default router;
