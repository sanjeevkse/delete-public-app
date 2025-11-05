import { Router } from "express";

import {
  createSchemeType,
  deleteSchemeType,
  deleteSchemeTypeStep,
  getSchemeType,
  listSchemeTypes,
  updateSchemeType,
  updateSchemeTypeStep
} from "../controllers/schemeTypeController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

/**
 * @route   GET /api/scheme-types
 * @desc    List scheme types with pagination, filters, and sorting
 * @access  Public
 */
router.get("/scheme-types", listSchemeTypes);

/**
 * @route   GET /api/scheme-types/:id
 * @desc    Fetch a single scheme type with steps
 * @access  Public
 */
router.get("/scheme-types/:id", getSchemeType);

/**
 * @route   POST /api/scheme-types
 * @desc    Create a scheme type with optional steps
 * @access  Protected
 */
router.post("/scheme-types", authenticate(), createSchemeType);

/**
 * @route   PUT /api/scheme-types/:id
 * @desc    Update a scheme type and optionally replace steps
 * @access  Protected
 */
router.put("/scheme-types/:id", authenticate(), updateSchemeType);

/**
 * @route   DELETE /api/scheme-types/:id
 * @desc    Delete a scheme type and its steps
 * @access  Protected
 */
router.delete("/scheme-types/:id", authenticate(), deleteSchemeType);

/**
 * @route   PUT /api/scheme-types/:schemeTypeId/steps/:stepId
 * @desc    Update a single scheme type step
 * @access  Protected
 */
router.put("/scheme-types/:schemeTypeId/steps/:stepId", authenticate(), updateSchemeTypeStep);

/**
 * @route   DELETE /api/scheme-types/:schemeTypeId/steps/:stepId
 * @desc    Delete a single scheme type step
 * @access  Protected
 */
router.delete("/scheme-types/:schemeTypeId/steps/:stepId", authenticate(), deleteSchemeTypeStep);

export default router;
