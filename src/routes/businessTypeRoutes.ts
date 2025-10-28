import { Router } from "express";

import {
  createBusinessType,
  deleteBusinessType,
  getBusinessType,
  listBusinessTypes,
  updateBusinessType,
  toggleBusinessTypeStatus
} from "../controllers/businessTypeController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

/**
 * @route   POST /api/business-types
 * @desc    Create a new business type
 * @access  Protected
 */
router.post("/business-types", authenticate(), createBusinessType);

/**
 * @route   GET /api/business-types
 * @desc    List all business types with pagination and search
 * @access  Public
 * @query   ?page=1&limit=25&search=keyword&status=1
 */
router.get("/business-types", listBusinessTypes);

/**
 * @route   GET /api/business-types/:id
 * @desc    Get a single business type by ID
 * @access  Public
 */
router.get("/business-types/:id", getBusinessType);

/**
 * @route   PUT /api/business-types/:id
 * @desc    Update a business type
 * @access  Protected
 */
router.put("/business-types/:id", authenticate(), updateBusinessType);

/**
 * @route   PATCH /api/business-types/:id/status
 * @desc    Toggle business type status (activate/deactivate)
 * @access  Protected
 */
router.patch("/business-types/:id/status", authenticate(), toggleBusinessTypeStatus);

/**
 * @route   DELETE /api/business-types/:id
 * @desc    Delete a business type
 * @access  Protected
 */
router.delete("/business-types/:id", authenticate(), deleteBusinessType);

export default router;
