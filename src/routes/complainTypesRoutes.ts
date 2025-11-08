import { Router } from "express";
import {
  createComplaintType,
  getAllComplaintTypes,
  getComplaintTypeById,
  updateComplaintType,
  deleteComplaintType
} from "../controllers/complaintTypeController";

import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

// CREATE
router.post("/complaint-types", authenticate(), createComplaintType);

// READ
router.get("/complaint-types", authenticate(), getAllComplaintTypes);
router.get("/complaint-types/:id", authenticate(), getComplaintTypeById);

// UPDATE
router.put("/complaint-types/:id", authenticate(), updateComplaintType);

// DELETE (soft delete)
router.delete("/complaint-types/:id", authenticate(), deleteComplaintType);

export default router;
