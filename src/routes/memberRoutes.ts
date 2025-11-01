import { Router } from "express";

import {
  createMember,
  deleteMember,
  getMember,
  listMembers,
  updateMember,
  checkMemberStatus
} from "../controllers/memberController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

/**
 * @route   GET /api/members/me/check
 * @desc    Check if the logged-in user is a member
 * @access  Private (requires authentication)
 */
router.get("/members/me/check", authenticate(), checkMemberStatus);

/**
 * @route   POST /api/members
 * @desc    Create a new member
 * @access  Public/Private (depending on your auth requirements)
 */
router.post("/members", authenticate(), createMember);

/**
 * @route   GET /api/members
 * @desc    List all members with pagination and search
 * @access  Public/Private
 * @query   ?page=1&limit=25&search=keyword
 */
router.get("/members", authenticate(), listMembers);

/**
 * @route   GET /api/members/:id
 * @desc    Get a single member by ID
 * @access  Public/Private
 */
router.get("/members/:id", authenticate(), getMember);

/**
 * @route   PUT /api/members/:id
 * @desc    Update a member
 * @access  Public/Private
 */
router.put("/members/:id", authenticate(), updateMember);

/**
 * @route   DELETE /api/members/:id
 * @desc    Delete a member
 * @access  Public/Private
 */
router.delete("/members/:id", authenticate(), deleteMember);

export default router;
