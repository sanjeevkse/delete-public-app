import { Router } from "express";

import {
  createPost,
  deletePost,
  getPost,
  listMyPosts,
  listPosts,
  reactToPost,
  updatePost
} from "../controllers/postController";
import { authenticate } from "../middlewares/authMiddleware";
import { authorizePermissions } from "../middlewares/authorizationMiddleware";

const router = Router();

router.get("/posts", authenticate(), authorizePermissions("*"), listPosts);
router.get("/posts/:id", authenticate(), authorizePermissions("*"), getPost);

router.get("/my-posts", authenticate(), authorizePermissions("*"), listMyPosts);

router.post("/posts", authenticate(), authorizePermissions("*"), createPost);
router.put("/posts/:id", authenticate(), authorizePermissions("*"), updatePost);
router.delete("/posts/:id", authenticate(), authorizePermissions("*"), deletePost);

router.post("/posts/:id/reactions", authenticate(), authorizePermissions("*"), reactToPost);

export default router;
