import { Router } from "express";
import {
  createComplaintStatus,
  getAllComplaintStatuses,
  getComplaintStatusById,
  updateComplaintStatus,
  deleteComplaintStatus,
  changeComplaintStatus,
  getComplaintStatusHistory
} from "../controllers/complaintStatusController";
import { authenticate } from "../middlewares/authMiddleware";
import { complaintMediaUpload } from "../middlewares/complaintMediaUpload";

const router = Router();

// META COMPLAINT STATUS CRUD
router.post("/complaint-statuses", authenticate(), createComplaintStatus);
router.get("/complaint-statuses", authenticate(), getAllComplaintStatuses);
router.get("/complaint-statuses/:id", authenticate(), getComplaintStatusById);
router.put("/complaint-statuses/:id", authenticate(), updateComplaintStatus);
router.delete("/complaint-statuses/:id", authenticate(), deleteComplaintStatus);

// CHANGE COMPLAINT STATUS (with optional media)
router.post(
  "/complaints/:complaintId/status",
  authenticate(),
  complaintMediaUpload,
  changeComplaintStatus
);

// GET STATUS HISTORY FOR A COMPLAINT
router.get("/complaints/:complaintId/status-history", authenticate(), getComplaintStatusHistory);

export default router;
