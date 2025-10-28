import express from "express";
import {
  createMlaConstituency,
  listMlaConstituencies,
  getMlaConstituencyById,
  updateMlaConstituency,
  toggleMlaConstituencyStatus,
  deleteMlaConstituency
} from "../controllers/mlaConstituencyController";
import { requireAuthenticatedUser } from "../middlewares/authMiddleware";

const router = express.Router();

router.post("/mla-constituencies", requireAuthenticatedUser, createMlaConstituency);
router.get("/mla-constituencies", listMlaConstituencies);
router.get("/mla-constituencies/:id", getMlaConstituencyById);
router.put("/mla-constituencies/:id", requireAuthenticatedUser, updateMlaConstituency);
router.patch(
  "/mla-constituencies/:id/status",
  requireAuthenticatedUser,
  toggleMlaConstituencyStatus
);
router.delete("/mla-constituencies/:id", requireAuthenticatedUser, deleteMlaConstituency);

export default router;
