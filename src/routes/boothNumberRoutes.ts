import express from "express";
import {
  createBoothNumber,
  listBoothNumbers,
  getBoothNumberById,
  updateBoothNumber,
  toggleBoothNumberStatus,
  deleteBoothNumber
} from "../controllers/boothNumberController";
import { authenticate, authenticateOptional } from "../middlewares/authMiddleware";

const router = express.Router();

router.post("/booth-numbers", authenticate(), createBoothNumber);
router.get("/booth-numbers", authenticateOptional(), listBoothNumbers);
router.get("/booth-numbers/:id", authenticateOptional(), getBoothNumberById);
router.put("/booth-numbers/:id", authenticate(), updateBoothNumber);
router.patch("/booth-numbers/:id/status", authenticate(), toggleBoothNumberStatus);
router.delete("/booth-numbers/:id", authenticate(), deleteBoothNumber);

export default router;
