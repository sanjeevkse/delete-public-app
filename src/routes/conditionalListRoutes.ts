import { Router } from "express";

import {
  createConditionalListItem,
  deleteConditionalListItem,
  getConditionalListItem,
  listConditionalListItems,
  updateConditionalListItem
} from "../controllers/conditionalListController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

router.get("/conditional-list", authenticate(), listConditionalListItems);
router.get("/conditional-list/:id", authenticate(), getConditionalListItem);
router.post("/conditional-list", authenticate(), createConditionalListItem);
router.put("/conditional-list/:id", authenticate(), updateConditionalListItem);
router.delete("/conditional-list/:id", authenticate(), deleteConditionalListItem);

export default router;
