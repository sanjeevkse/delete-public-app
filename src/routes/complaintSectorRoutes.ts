import { Router } from "express";
import {
  createComplaintSector,
  getAllComplaintSectors,
  getComplaintSectorById,
  updateComplaintSector,
  deleteComplaintSector
} from "../controllers/complaintSectorController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

// CREATE
router.post("/complaint-sectors", authenticate(), createComplaintSector);

// READ
router.get("/complaint-sectors", authenticate(), getAllComplaintSectors);
router.get("/complaint-sectors/:id", authenticate(), getComplaintSectorById);

// UPDATE
router.put("/complaint-sectors/:id", authenticate(), updateComplaintSector);

// DELETE (soft delete)
router.delete("/complaint-sectors/:id", authenticate(), deleteComplaintSector);

export default router;
