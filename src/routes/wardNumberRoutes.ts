import express from "express";
import {
  createWardNumber,
  listWardNumbers,
  getWardNumberById,
  updateWardNumber,
  toggleWardNumberStatus,
  deleteWardNumber
} from "../controllers/wardNumberController";
import { requireAuthenticatedUser } from "../middlewares/authMiddleware";

const router = express.Router();

router.post("/ward-numbers", requireAuthenticatedUser, createWardNumber);
router.get("/ward-numbers", listWardNumbers);
router.get("/ward-numbers/:id", getWardNumberById);
router.put("/ward-numbers/:id", requireAuthenticatedUser, updateWardNumber);
router.patch("/ward-numbers/:id/status", requireAuthenticatedUser, toggleWardNumberStatus);
router.delete("/ward-numbers/:id", requireAuthenticatedUser, deleteWardNumber);

export default router;
