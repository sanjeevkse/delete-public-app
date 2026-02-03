import { Router } from "express";
import { AdminDashboardController } from "../controllers/adminDashboardController";
import { authenticate } from "../middlewares/authMiddleware";
import permissionRoutes from "./permissionRoutes";
import permissionGroupRoutes from "./permissionGroupRoutes";
import roleRoutes from "./roleRoutes";
import userRoutes from "./userRoutes";

const router = Router();

// Authentication required for admin routes
router.use(authenticate());

// Dashboard route
router.get("/", AdminDashboardController.getDashboard);

router.use("/users", userRoutes);
router.use("/roles", roleRoutes);
router.use("/permissions", permissionRoutes);
router.use("/permission-groups", permissionGroupRoutes);

export default router;
