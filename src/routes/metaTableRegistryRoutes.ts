import express from "express";
import {
  getRegistryEntries,
  getRegistryEntry,
  createRegistryEntry,
  updateRegistryEntry,
  deleteRegistryEntry,
  reloadRegistry,
  getRegistryStats
} from "../controllers/metaTableRegistryController";
import { authenticate } from "../middlewares/authMiddleware";
import { authorizePermissions } from "../middlewares/authorizationMiddleware";

const router = express.Router();

// All registry routes require authentication and admin permissions
router.use(authenticate());
router.use(authorizePermissions("meta_table_registry.view", "admin"));

/**
 * @route GET /api/meta-table-registry/stats
 * @desc Get registry statistics
 */
router.get("/stats", getRegistryStats);

/**
 * @route POST /api/meta-table-registry/reload
 * @desc Reload registry cache
 */
router.post("/reload", authorizePermissions("meta_table_registry.manage", "admin"), reloadRegistry);

/**
 * @route GET /api/meta-table-registry
 * @desc Get all registry entries with pagination
 */
router.get("/", getRegistryEntries);

/**
 * @route GET /api/meta-table-registry/:id
 * @desc Get a single registry entry
 */
router.get("/:id", getRegistryEntry);

/**
 * @route POST /api/meta-table-registry
 * @desc Create a new registry entry
 */
router.post("/", authorizePermissions("meta_table_registry.create", "admin"), createRegistryEntry);

/**
 * @route PUT /api/meta-table-registry/:id
 * @desc Update a registry entry
 */
router.put(
  "/:id",
  authorizePermissions("meta_table_registry.update", "admin"),
  updateRegistryEntry
);

/**
 * @route DELETE /api/meta-table-registry/:id
 * @desc Delete (soft delete) a registry entry
 */
router.delete(
  "/:id",
  authorizePermissions("meta_table_registry.delete", "admin"),
  deleteRegistryEntry
);

export default router;
