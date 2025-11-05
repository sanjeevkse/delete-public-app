import { Router } from "express";

import {
  createUser,
  deleteUser,
  getUser,
  listUsers,
  updateUser,
  updateUserStatus
} from "../controllers/userController";
import { assignRoleToUser, unassignRoleFromUser } from "../controllers/roleController";
import { authorizePermissions } from "../middlewares/authorizationMiddleware";

const router = Router();

router.post("/", createUser);

router.get("/", listUsers);
router.get("/:id", getUser);
router.put("/:id", updateUser);
router.patch("/:id/update-status", updateUserStatus);
router.delete("/:id", deleteUser);
router.post("/:userId/roles", assignRoleToUser);
router.delete("/:userId/roles/:roleId", unassignRoleFromUser);

export default router;
