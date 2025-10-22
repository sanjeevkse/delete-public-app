import { Router } from "express";

import {
  createUser,
  deleteUser,
  getUser,
  listUsers,
  updateUser
} from "../controllers/userController";
import { assignRoleToUser } from "../controllers/roleController";
import { authorizePermissions } from "../middlewares/authorizationMiddleware";

const router = Router();

router.post("/", authorizePermissions("*"), createUser);

router.get("/", authorizePermissions("*"), listUsers);
router.get("/:id", authorizePermissions("*"), getUser);
router.put("/:id", authorizePermissions("*"), updateUser);
router.delete("/:id", authorizePermissions("*"), deleteUser);
router.post("/:userId/roles", authorizePermissions("*"), assignRoleToUser);

export default router;
