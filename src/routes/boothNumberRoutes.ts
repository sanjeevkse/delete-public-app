import express from "express";
import {
  createBoothNumber,
  listBoothNumbers,
  getBoothNumberById,
  updateBoothNumber,
  toggleBoothNumberStatus,
  deleteBoothNumber
} from "../controllers/boothNumberController";
import { requireAuthenticatedUser } from "../middlewares/authMiddleware";

const router = express.Router();

router.post("/booth-numbers", requireAuthenticatedUser, createBoothNumber);
router.get("/booth-numbers", listBoothNumbers);
router.get("/booth-numbers/:id", getBoothNumberById);
router.put("/booth-numbers/:id", requireAuthenticatedUser, updateBoothNumber);
router.patch("/booth-numbers/:id/status", requireAuthenticatedUser, toggleBoothNumberStatus);
router.delete("/booth-numbers/:id", requireAuthenticatedUser, deleteBoothNumber);

export default router;
