import { Router } from "express";

import {
  createSidebarItem,
  deleteSidebarItem,
  getSidebarItem,
  listSidebarItems,
  updateSidebarItem,
  assignRoleToSidebar,
  removeRoleFromSidebar,
  assignPermissionGroupToSidebar,
  removePermissionGroupFromSidebar
} from "../controllers/sidebarController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

router.get("/sidebar", listSidebarItems);
router.get("/sidebar/:id", getSidebarItem);
router.post("/sidebar", authenticate(), createSidebarItem);
router.put("/sidebar/:id", authenticate(), updateSidebarItem);
router.delete("/sidebar/:id", authenticate(), deleteSidebarItem);

// Role-based sidebar access management
router.post("/sidebar/:sidebarId/roles/:roleId", authenticate(), assignRoleToSidebar);
router.delete("/sidebar/:sidebarId/roles/:roleId", authenticate(), removeRoleFromSidebar);

// Permission group-based sidebar access management
router.post(
  "/sidebar/:sidebarId/permission-groups/:groupId",
  authenticate(),
  assignPermissionGroupToSidebar
);
router.delete(
  "/sidebar/:sidebarId/permission-groups/:groupId",
  authenticate(),
  removePermissionGroupFromSidebar
);

export default router;
