import { Router } from "express";

import {
  createFamilyMember,
  deleteFamilyMember,
  getFamilyMember,
  listFamilyMembers,
  updateFamilyMember,
  toggleFamilyMemberStatus
} from "../controllers/familyMemberController";
import { authenticate } from "../middlewares/authMiddleware";
import { parseFormData } from "../middlewares/formDataMiddleware";

const router = Router();

/**
 * @route   POST /api/family-members
 * @desc    Create a new family member
 * @access  Protected
 */
router.post("/family-members", authenticate(), parseFormData, createFamilyMember);

/**
 * @route   GET /api/family-members
 * @desc    List all family members with pagination and search
 * @access  Public
 * @query   ?page=1&limit=25&search=keyword&status=1&userId=1&relationTypeId=1
 */
router.get("/family-members", authenticate(), listFamilyMembers);

/**
 * @route   GET /api/family-members/:id
 * @desc    Get a single family member by ID
 * @access  Public
 */
router.get("/family-members/:id", getFamilyMember);

/**
 * @route   PUT /api/family-members/:id
 * @desc    Update a family member
 * @access  Protected
 */
router.put("/family-members/:id", authenticate(), updateFamilyMember);

/**
 * @route   PATCH /api/family-members/:id/status
 * @desc    Toggle family member status (activate/deactivate)
 * @access  Protected
 */
router.patch("/family-members/:id/status", authenticate(), toggleFamilyMemberStatus);

/**
 * @route   DELETE /api/family-members/:id
 * @desc    Delete a family member
 * @access  Protected
 */
router.delete("/family-members/:id", authenticate(), deleteFamilyMember);

export default router;
