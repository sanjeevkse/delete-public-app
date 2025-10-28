import { Router } from "express";

import {
  createBusiness,
  deleteBusiness,
  getBusiness,
  listBusinesses,
  updateBusiness,
  toggleBusinessStatus
} from "../controllers/businessController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

/**
 * @route   POST /api/businesses
 * @desc    Create a new business
 * @access  Protected
 */
router.post("/businesses", authenticate, createBusiness);

/**
 * @route   GET /api/businesses
 * @desc    List all businesses with pagination and search
 * @access  Public
 * @query   ?page=1&limit=25&search=keyword&status=1&businessTypeId=1
 */
router.get("/businesses", listBusinesses);

/**
 * @route   GET /api/businesses/:id
 * @desc    Get a single business by ID
 * @access  Public
 */
router.get("/businesses/:id", getBusiness);

/**
 * @route   PUT /api/businesses/:id
 * @desc    Update a business
 * @access  Protected
 */
router.put("/businesses/:id", authenticate, updateBusiness);

/**
 * @route   PATCH /api/businesses/:id/status
 * @desc    Toggle business status (activate/deactivate)
 * @access  Protected
 */
router.patch("/businesses/:id/status", authenticate, toggleBusinessStatus);

/**
 * @route   DELETE /api/businesses/:id
 * @desc    Delete a business
 * @access  Protected
 */
router.delete("/businesses/:id", authenticate, deleteBusiness);

export default router;
