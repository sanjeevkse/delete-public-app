import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware";
import roleRoutes from "./roleRoutes";
import userRoutes from "./userRoutes";

const router = Router();

router.use(authenticate());
router.use("/users", userRoutes);
router.use("/roles", roleRoutes);

export default router;
