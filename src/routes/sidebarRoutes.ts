import { Router } from "express";

import {
  createSidebarItem,
  deleteSidebarItem,
  getSidebarItem,
  listSidebarItems,
  updateSidebarItem
} from "../controllers/sidebarController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

router.get("/sidebar", listSidebarItems);
router.get("/sidebar/:id", getSidebarItem);
router.post("/sidebar", authenticate(), createSidebarItem);
router.put("/sidebar/:id", authenticate(), updateSidebarItem);
router.delete("/sidebar/:id", authenticate(), deleteSidebarItem);

export default router;
