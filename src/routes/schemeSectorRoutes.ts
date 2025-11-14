import { Router } from "express";

import {
  createSchemeSector,
  deleteSchemeSector,
  getSchemeSector,
  listSchemeSectors,
  updateSchemeSector,
  toggleSchemeSectorStatus
} from "../controllers/schemeSectorController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

/**
 * @route   POST /api/scheme-sectors
 * @desc    Create a new scheme sector
 * @access  Protected
 */
router.post("/scheme-sectors", authenticate(), createSchemeSector);

/**
 * @route   GET /api/scheme-sectors
 * @desc    List all scheme sectors with pagination and search
 * @access  Public
 * @query   ?page=1&limit=25&search=keyword&status=1
 */
router.get("/scheme-sectors", listSchemeSectors);

/**
 * @route   GET /api/scheme-sectors/:id
 * @desc    Get a single scheme sector by ID
 * @access  Public
 */
router.get("/scheme-sectors/:id", getSchemeSector);

/**
 * @route   PUT /api/scheme-sectors/:id
 * @desc    Update a scheme sector
 * @access  Protected
 */
router.put("/scheme-sectors/:id", authenticate(), updateSchemeSector);

/**
 * @route   DELETE /api/scheme-sectors/:id
 * @desc    Delete a scheme sector
 * @access  Protected
 */
router.delete("/scheme-sectors/:id", authenticate(), deleteSchemeSector);

/**
 * @route   PATCH /api/scheme-sectors/:id/status
 * @desc    Toggle scheme sector status
 * @access  Protected
 */
router.patch("/scheme-sectors/:id/status", authenticate(), toggleSchemeSectorStatus);

export default router;
