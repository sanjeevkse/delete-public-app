import { Router } from "express";

import adminRoutes from "./adminRoutes";
import authRoutes from "./authRoutes";
import postRoutes from "./postRoutes";
import eventRoutes from "./eventRoutes";
import memberRoutes from "./memberRoutes";
import communityTypeRoutes from "./communityTypeRoutes";
import communityRoutes from "./communityRoutes";
import relationTypeRoutes from "./relationTypeRoutes";
import familyMemberRoutes from "./familyMemberRoutes";
import businessTypeRoutes from "./businessTypeRoutes";
import businessRoutes from "./businessRoutes";

const router = Router();

router.use("/auth", authRoutes);

router.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

router.use("/", postRoutes);
router.use("/", eventRoutes);
router.use("/", memberRoutes);
router.use("/", communityTypeRoutes);
router.use("/", communityRoutes);
router.use("/", relationTypeRoutes);
router.use("/", familyMemberRoutes);
router.use("/", businessTypeRoutes);
router.use("/", businessRoutes);
router.use("/admin", adminRoutes);

export default router;
