import { Router } from "express";

import adminRoutes from "./adminRoutes";
import authRoutes from "./authRoutes";
import eventRoutes from "./eventRoutes";
import jobRoutes from "./jobRoutes";
import postRoutes from "./postRoutes";
import schemeRoutes from "./schemeRoutes";

const router = Router();

router.use("/auth", authRoutes);

router.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

router.use("/", postRoutes);
router.use("/", eventRoutes);
router.use("/", jobRoutes);
router.use("/", schemeRoutes);
router.use("/admin", adminRoutes);

export default router;
