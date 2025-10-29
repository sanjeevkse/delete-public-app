import { Router } from "express";

import {
  listPermissionGroups,
  getPermissionGroup,
  getPermissionGroupPermissions,
  createPermissionGroup,
  updatePermissionGroup,
  deletePermissionGroup,
  deactivatePermissionGroup,
  activatePermissionGroup
} from "../controllers/permissionGroupController";
import { authorizePermissions } from "../middlewares/authorizationMiddleware";

const router = Router();

// List all permission groups
router.get("/", listPermissionGroups);

// Get a single permission group
router.get("/:id", getPermissionGroup);

// Get permissions for a permission group
router.get("/:id/permissions", getPermissionGroupPermissions);

// Create a new permission group
router.post("/", createPermissionGroup);

// Update a permission group
router.put("/:id", updatePermissionGroup);

// Delete a permission group
router.delete("/:id", deletePermissionGroup);

// Deactivate a permission group
router.patch("/:id/deactivate", deactivatePermissionGroup);

// Activate a permission group
router.patch("/:id/activate", activatePermissionGroup);

export default router;
