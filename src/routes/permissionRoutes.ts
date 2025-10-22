import { Router } from "express";

import { listPermissions } from "../controllers/permissionController";
import { authorizePermissions } from "../middlewares/authorizationMiddleware";

const router = Router();

router.get("/", authorizePermissions("permissions:list"), listPermissions);

export default router;

