import { Router } from "express";

import { ADMIN_ROLE_NAME } from "../config/rbac";
import { authorizeRoles } from "../middlewares/authorizationMiddleware";
import { authenticate } from "../middlewares/authMiddleware";
import roleRoutes from "./roleRoutes";
import userRoutes from "./userRoutes";

const router = Router();

router.use(authenticate());
router.use(authorizeRoles(ADMIN_ROLE_NAME));

router.use("/users", userRoutes);
router.use("/roles", roleRoutes);

export default router;
