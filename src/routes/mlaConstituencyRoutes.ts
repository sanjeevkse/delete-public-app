import express from "express";
import {
  createMlaConstituency,
  listMlaConstituencies,
  getMlaConstituencyById,
  updateMlaConstituency,
  toggleMlaConstituencyStatus,
  deleteMlaConstituency
} from "../controllers/mlaConstituencyController";
import { authenticate } from "../middlewares/authMiddleware";

const router = express.Router();

router.post("/mla-constituencies", authenticate(), createMlaConstituency);
router.get("/mla-constituencies", listMlaConstituencies);
router.get("/mla-constituencies/:id", getMlaConstituencyById);
router.put("/mla-constituencies/:id", authenticate(), updateMlaConstituency);
router.patch(
  "/mla-constituencies/:id/status",
  authenticate(),
  toggleMlaConstituencyStatus
);
router.delete("/mla-constituencies/:id", authenticate(), deleteMlaConstituency);

export default router;
