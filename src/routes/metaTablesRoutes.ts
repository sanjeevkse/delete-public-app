import { Router } from "express";

import { authenticate } from "../middlewares/authMiddleware";
import {
  listMetaTables,
  getMetaTableData,
  getMetaTableRecord,
  createMetaTableRecord,
  updateMetaTableRecord,
  deleteMetaTableRecord,
  getMetaTableSchema,
  bulkUpdateStatus,
  getMetaTableStats
} from "../controllers/metaTablesController";

const router = Router();

// All routes require authentication - list all meta tables
router.get("/meta-tables", authenticate(), listMetaTables);

// Get meta table statistics
router.get("/meta-tables/:tableName/stats", authenticate(), getMetaTableStats);

// Get meta table schema
router.get("/meta-tables/:tableName/schema", authenticate(), getMetaTableSchema);

// Get all records from a specific meta table
router.get("/meta-tables/:tableName/data", authenticate(), getMetaTableData);

// Get a single record from a meta table
router.get("/meta-tables/:tableName/data/:id", authenticate(), getMetaTableRecord);

// Create new record
router.post("/meta-tables/:tableName/data", authenticate(), createMetaTableRecord);

// Update existing record
router.put("/meta-tables/:tableName/data/:id", authenticate(), updateMetaTableRecord);

// Delete record
router.delete("/meta-tables/:tableName/data/:id", authenticate(), deleteMetaTableRecord);

// Bulk update status
router.patch("/meta-tables/:tableName/bulk-status", authenticate(), bulkUpdateStatus);

export default router;
