import { Router } from "express";

import adminRoutes from "./adminRoutes";
import authRoutes from "./authRoutes";
import eventRoutes from "./eventRoutes";
import jobRoutes from "./jobRoutes";
import postRoutes from "./postRoutes";
import schemeRoutes from "./schemeRoutes";
import schemeCategoryRoutes from "./schemeCategoryRoutes";
import schemeSectorRoutes from "./schemeSectorRoutes";
import memberRoutes from "./memberRoutes";
import communityRoutes from "./communityRoutes";
import familyMemberRoutes from "./familyMemberRoutes";
import businessRoutes from "./businessRoutes";
import sidebarRoutes from "./sidebarRoutes";
import wardNumberRoutes from "./wardNumberRoutes";
import mlaConstituencyRoutes from "./mlaConstituencyRoutes";
import boothNumberRoutes from "./boothNumberRoutes";
import sectorDepartmentRoutes from "./sectorDepartmentRoutes";
import complaintTypeRoutes from "./complainTypesRoutes";
import complaintRoutes from "./complaintRoutes";
import complaintStatusRoutes from "./complaintStatusRoutes";
import PaEventRoutes from "./PaEventRoutes";
import formBuilderRoutes from "./formBuilderRoutes";
import formEventRoutes from "./formEventRoutes";
import metaTablesRoutes from "./metaTablesRoutes";
import userSchemeApplicationRoutes from "./userSchemeApplicationRoutes";
import notificationRoutes from "./notificationRoutes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/auth", sidebarRoutes);

router.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

router.use("/", postRoutes);
router.use("/", eventRoutes);
router.use("/", jobRoutes);
router.use("/", schemeRoutes);
router.use("/", schemeCategoryRoutes);
router.use("/", schemeSectorRoutes);
router.use("/", userSchemeApplicationRoutes);
router.use("/", memberRoutes);
router.use("/", communityRoutes);
router.use("/", familyMemberRoutes);
router.use("/", businessRoutes);
router.use("/", wardNumberRoutes);
router.use("/", mlaConstituencyRoutes);
router.use("/", boothNumberRoutes);
router.use("/", sectorDepartmentRoutes);
router.use("/", complaintTypeRoutes);
router.use("/", complaintRoutes);
router.use("/", complaintStatusRoutes);
router.use("/", PaEventRoutes);
router.use("/", formBuilderRoutes);
router.use("/", formEventRoutes);
router.use("/", metaTablesRoutes);
router.use("/notifications", notificationRoutes);
router.use("/admin", adminRoutes);

export default router;
