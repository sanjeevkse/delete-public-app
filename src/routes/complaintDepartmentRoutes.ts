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
router.post("/complaint-departments", authenticate(), createComplaintDepartment);

// READ
router.get("/complaint-departments", authenticate(), getAllComplaintDepartments);
router.get("/complaint-departments/:id", authenticate(), getComplaintDepartmentById);

// UPDATE
router.put("/complaint-departments/:id", authenticate(), updateComplaintDepartment);

// DELETE (soft delete)
router.delete("/complaint-departments/:id", authenticate(), deleteComplaintDepartment);

export default router;
