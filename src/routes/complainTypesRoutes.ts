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
router.post("/createComplaintType", authenticate(), createComplaintType);

// READ
router.get("/getAllComplaintTypes", authenticate(), getAllComplaintTypes);
router.get("/getComplaintType/:id", authenticate(), getComplaintTypeById);

// UPDATE
router.put("/updateComplaintType/:id", authenticate(), updateComplaintType);

// DELETE (soft delete)
router.delete("/deleteComplaintType/:id", authenticate(), deleteComplaintType);

export default router;
