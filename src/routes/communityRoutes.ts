import { Router } from "express";

import {
  createCommunity,
  deleteCommunity,
  getCommunity,
  listCommunities,
  updateCommunity,
  toggleCommunityStatus,
  updateMemberCount
} from "../controllers/communityController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

/**
 * @route   POST /api/communities
 * @desc    Create a new community
 * @access  Protected
 */
router.post("/communities", authenticate(), createCommunity);

/**
 * @route   GET /api/communities
 * @desc    List all communities with pagination and search
 * @access  Public
 * @query   ?page=1&limit=25&search=keyword&status=1&communityTypeId=1&isRegistered=1
 */
router.get("/communities", listCommunities);

/**
 * @route   GET /api/communities/:id
 * @desc    Get a single community by ID
 * @access  Public
 */
router.get("/communities/:id", getCommunity);

/**
 * @route   PUT /api/communities/:id
 * @desc    Update a community
 * @access  Protected
 */
router.put("/communities/:id", authenticate(), updateCommunity);

/**
 * @route   PATCH /api/communities/:id/status
 * @desc    Toggle community status (activate/deactivate)
 * @access  Protected
 */
router.patch("/communities/:id/status", authenticate(), toggleCommunityStatus);

/**
 * @route   PATCH /api/communities/:id/member-count
 * @desc    Update community member count
 * @access  Protected
 */
router.patch("/communities/:id/member-count", authenticate(), updateMemberCount);

/**
 * @route   DELETE /api/communities/:id
 * @desc    Delete a community
 * @access  Protected
 */
router.delete("/communities/:id", authenticate(), deleteCommunity);

export default router;
