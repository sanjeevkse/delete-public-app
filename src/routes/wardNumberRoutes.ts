import express from "express";
import {
  createWardNumber,
  listWardNumbers,
  getWardNumberById,
  updateWardNumber,
  toggleWardNumberStatus,
  deleteWardNumber
} from "../controllers/wardNumberController";
import { authenticate } from "../middlewares/authMiddleware";

const router = express.Router();

router.post("/ward-numbers", authenticate(), createWardNumber);
router.get("/ward-numbers", listWardNumbers);
router.get("/ward-numbers/:id", getWardNumberById);
router.put("/ward-numbers/:id", authenticate(), updateWardNumber);
router.patch("/ward-numbers/:id/status", authenticate(), toggleWardNumberStatus);
router.delete("/ward-numbers/:id", authenticate(), deleteWardNumber);

export default router;
