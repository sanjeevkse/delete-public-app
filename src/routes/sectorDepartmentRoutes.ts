import { Router } from "express";
import {
  createSectorDepartment,
  getAllSectorDepartments,
  getSectorDepartmentById,
  updateSectorDepartment,
  deleteSectorDepartment
} from "../controllers/sectorDepartmentController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

// CREATE
router.post("/sector-departments", authenticate(), createSectorDepartment);

// READ
router.get("/sector-departments", authenticate(), getAllSectorDepartments);
router.get("/sector-departments/:id", authenticate(), getSectorDepartmentById);

// UPDATE
router.put("/sector-departments/:id", authenticate(), updateSectorDepartment);

// DELETE (soft delete)
router.delete("/sector-departments/:id", authenticate(), deleteSectorDepartment);

export default router;
