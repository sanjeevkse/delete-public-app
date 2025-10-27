import { Router } from "express";

import {
  createUser,
  deleteUser,
  getUser,
  listUsers,
  updateUser
} from "../controllers/userController";
import { assignRoleToUser, unassignRoleFromUser } from "../controllers/roleController";
import { authorizePermissions } from "../middlewares/authorizationMiddleware";

const router = Router();

router.post("/", authorizePermissions("users:create"), createUser);

router.get("/", authorizePermissions("users:list"), listUsers);
router.get("/:id", authorizePermissions("users:view"), getUser);
router.put("/:id", authorizePermissions("users:update"), updateUser);
router.delete("/:id", authorizePermissions("users:delete"), deleteUser);
router.post("/:userId/roles", authorizePermissions("users:update"), assignRoleToUser);
router.delete("/:userId/roles/:roleId", authorizePermissions("users:update"), unassignRoleFromUser);

export default router;
