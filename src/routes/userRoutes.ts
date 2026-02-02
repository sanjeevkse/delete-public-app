import { Router } from "express";

import {
  createUser,
  deleteUser,
  getUser,
  getUserByMobileNumber,
  listUsers,
  listUsersPendingApproval,
  updateUser,
  updateUserPostsBlockStatus,
  updateUserStatus
} from "../controllers/userController";
import { assignRoleToUser, unassignRoleFromUser } from "../controllers/roleController";
import { authorizePermissions } from "../middlewares/authorizationMiddleware";

const router = Router();

router.post("/", createUser);

router.get("/", listUsers);
router.get("/pending-approval", listUsersPendingApproval);
router.get("/by-mobile/:contactNumber", getUserByMobileNumber);
router.get("/:id", getUser);
router.put("/:id", updateUser);
router.patch("/:id/posts-block", updateUserPostsBlockStatus);
router.patch("/:id/update-status", updateUserStatus);
router.delete("/:id", deleteUser);
router.post("/:userId/roles", assignRoleToUser);
router.delete("/:userId/roles/:roleId", unassignRoleFromUser);

export default router;
