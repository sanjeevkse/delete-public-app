import { Router } from "express";

import {
  createUser,
  deleteUser,
  getUser,
  listUsers,
  updateUser
} from "../controllers/userController";
import { assignRoleToUser } from "../controllers/roleController";

const router = Router();

router.post("/", createUser);

router.get("/", listUsers);
router.get("/:id", getUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);
router.post("/:userId/roles", assignRoleToUser);

export default router;
