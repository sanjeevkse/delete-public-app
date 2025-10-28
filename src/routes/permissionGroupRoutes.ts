import { Router } from "express";

import {
  listPermissionGroups,
  getPermissionGroup,
  createPermissionGroup,
  updatePermissionGroup,
  deletePermissionGroup,
  deactivatePermissionGroup,
  activatePermissionGroup
} from "../controllers/permissionGroupController";
import { authorizePermissions } from "../middlewares/authorizationMiddleware";

const router = Router();

// List all permission groups
router.get(
  "/",
  authorizePermissions("permission-groups:list"),
  listPermissionGroups
);

// Get a single permission group
router.get(
  "/:id",
  authorizePermissions("permission-groups:view"),
  getPermissionGroup
);

// Create a new permission group
router.post(
  "/",
  authorizePermissions("permission-groups:create"),
  createPermissionGroup
);

// Update a permission group
router.put(
  "/:id",
  authorizePermissions("permission-groups:update"),
  updatePermissionGroup
);

// Delete a permission group
router.delete(
  "/:id",
  authorizePermissions("permission-groups:delete"),
  deletePermissionGroup
);

// Deactivate a permission group
router.patch(
  "/:id/deactivate",
  authorizePermissions("permission-groups:update"),
  deactivatePermissionGroup
);

// Activate a permission group
router.patch(
  "/:id/activate",
  authorizePermissions("permission-groups:update"),
  activatePermissionGroup
);

export default router;
