import { Router } from "express";

import adminRoutes from "./adminRoutes";
import authRoutes from "./authRoutes";
import postRoutes from "./postRoutes";
import eventRoutes from "./eventRoutes";
import memberRoutes from "./memberRoutes";
import communityTypeRoutes from "./communityTypeRoutes";

const router = Router();

router.use("/auth", authRoutes);

router.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

router.use("/", postRoutes);
router.use("/", eventRoutes);
router.use("/", memberRoutes);
router.use("/", communityTypeRoutes);
router.use("/admin", adminRoutes);

export default router;
