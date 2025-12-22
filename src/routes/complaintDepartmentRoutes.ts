import { Router } from "express";
import {
  createComplaintDepartment,
  getAllComplaintDepartments,
  getComplaintDepartmentById,
  updateComplaintDepartment,
  deleteComplaintDepartment
} from "../controllers/complaintDepartmentController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

// CREATE
router.post("/sector-departments", authenticate(), createComplaintDepartment);

// READ
router.get("/sector-departments", authenticate(), getAllComplaintDepartments);
router.get("/sector-departments/:id", authenticate(), getComplaintDepartmentById);

// UPDATE
router.put("/sector-departments/:id", authenticate(), updateComplaintDepartment);

// DELETE (soft delete)
router.delete("/sector-departments/:id", authenticate(), deleteComplaintDepartment);

export default router;
