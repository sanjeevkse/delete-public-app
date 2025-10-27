import { Router } from "express";

import {
  createMember,
  deleteMember,
  getMember,
  listMembers,
  updateMember
} from "../controllers/memberController";

const router = Router();

/**
 * @route   POST /api/members
 * @desc    Create a new member
 * @access  Public/Private (depending on your auth requirements)
 */
router.post("/members", createMember);

/**
 * @route   GET /api/members
 * @desc    List all members with pagination and search
 * @access  Public/Private
 * @query   ?page=1&limit=25&search=keyword
 */
router.get("/members", listMembers);

/**
 * @route   GET /api/members/:id
 * @desc    Get a single member by ID
 * @access  Public/Private
 */
router.get("/members/:id", getMember);

/**
 * @route   PUT /api/members/:id
 * @desc    Update a member
 * @access  Public/Private
 */
router.put("/members/:id", updateMember);

/**
 * @route   DELETE /api/members/:id
 * @desc    Delete a member
 * @access  Public/Private
 */
router.delete("/members/:id", deleteMember);

export default router;
