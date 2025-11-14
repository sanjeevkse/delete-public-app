import { Router } from "express";

import {
  createSchemeCategory,
  deleteSchemeCategory,
  getSchemeCategory,
  listSchemeCategories,
  updateSchemeCategory,
  toggleSchemeCategoryStatus
} from "../controllers/schemeCategoryController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

/**
 * @route   POST /api/scheme-categories
 * @desc    Create a new scheme category
 * @access  Protected
 */
router.post("/scheme-categories", authenticate(), createSchemeCategory);

/**
 * @route   GET /api/scheme-categories
 * @desc    List all scheme categories with pagination and search
 * @access  Public
 * @query   ?page=1&limit=25&search=keyword&status=1
 */
router.get("/scheme-categories", listSchemeCategories);

/**
 * @route   GET /api/scheme-categories/:id
 * @desc    Get a single scheme category by ID
 * @access  Public
 */
router.get("/scheme-categories/:id", getSchemeCategory);

/**
 * @route   PUT /api/scheme-categories/:id
 * @desc    Update a scheme category
 * @access  Protected
 */
router.put("/scheme-categories/:id", authenticate(), updateSchemeCategory);

/**
 * @route   DELETE /api/scheme-categories/:id
 * @desc    Delete a scheme category
 * @access  Protected
 */
router.delete("/scheme-categories/:id", authenticate(), deleteSchemeCategory);

/**
 * @route   PATCH /api/scheme-categories/:id/status
 * @desc    Toggle scheme category status
 * @access  Protected
 */
router.patch("/scheme-categories/:id/status", authenticate(), toggleSchemeCategoryStatus);

export default router;
