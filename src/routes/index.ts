import { Router } from "express";

import adminRoutes from "./adminRoutes";
import authRoutes from "./authRoutes";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);

export default router;
