import { Router } from "express";

import {
  createCommunityType,
  deleteCommunityType,
  getCommunityType,
  listCommunityTypes,
  updateCommunityType,
  toggleCommunityTypeStatus
} from "../controllers/communityTypeController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

/**
 * @route   POST /api/community-types
 * @desc    Create a new community type
 * @access  Protected
 */
router.post("/community-types", authenticate, createCommunityType);

/**
 * @route   GET /api/community-types
 * @desc    List all community types with pagination and search
 * @access  Public
 * @query   ?page=1&limit=25&search=keyword&status=1
 */
router.get("/community-types", listCommunityTypes);

/**
 * @route   GET /api/community-types/:id
 * @desc    Get a single community type by ID
 * @access  Public
 */
router.get("/community-types/:id", getCommunityType);

/**
 * @route   PUT /api/community-types/:id
 * @desc    Update a community type
 * @access  Protected
 */
router.put("/community-types/:id", authenticate, updateCommunityType);

/**
 * @route   PATCH /api/community-types/:id/status
 * @desc    Toggle community type status (activate/deactivate)
 * @access  Protected
 */
router.patch("/community-types/:id/status", authenticate, toggleCommunityTypeStatus);

/**
 * @route   DELETE /api/community-types/:id
 * @desc    Delete a community type
 * @access  Protected
 */
router.delete("/community-types/:id", authenticate, deleteCommunityType);

export default router;
