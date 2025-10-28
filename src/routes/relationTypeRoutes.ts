import { Router } from "express";

import {
  createRelationType,
  deleteRelationType,
  getRelationType,
  listRelationTypes,
  updateRelationType,
  toggleRelationTypeStatus
} from "../controllers/relationTypeController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

/**
 * @route   POST /api/relation-types
 * @desc    Create a new relation type
 * @access  Protected
 */
router.post("/relation-types", authenticate, createRelationType);

/**
 * @route   GET /api/relation-types
 * @desc    List all relation types with pagination and search
 * @access  Public
 * @query   ?page=1&limit=25&search=keyword&status=1
 */
router.get("/relation-types", listRelationTypes);

/**
 * @route   GET /api/relation-types/:id
 * @desc    Get a single relation type by ID
 * @access  Public
 */
router.get("/relation-types/:id", getRelationType);

/**
 * @route   PUT /api/relation-types/:id
 * @desc    Update a relation type
 * @access  Protected
 */
router.put("/relation-types/:id", authenticate, updateRelationType);

/**
 * @route   PATCH /api/relation-types/:id/status
 * @desc    Toggle relation type status (activate/deactivate)
 * @access  Protected
 */
router.patch("/relation-types/:id/status", authenticate, toggleRelationTypeStatus);

/**
 * @route   DELETE /api/relation-types/:id
 * @desc    Delete a relation type
 * @access  Protected
 */
router.delete("/relation-types/:id", authenticate, deleteRelationType);

export default router;
