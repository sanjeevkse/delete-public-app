import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware";
import permissionRoutes from "./permissionRoutes";
import roleRoutes from "./roleRoutes";
import userRoutes from "./userRoutes";

const router = Router();

router.use(authenticate());
router.use("/users", userRoutes);
router.use("/roles", roleRoutes);
router.use("/permissions", permissionRoutes);

export default router;
