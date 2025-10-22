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

router.get("/posts", authenticate(), authorizePermissions("posts:list"), listPosts);
router.get("/posts/:id", authenticate(), authorizePermissions("posts:view"), getPost);
router.get("/my-posts", authenticate(), authorizePermissions("posts:view"), listMyPosts);
router.post("/posts", authenticate(), authorizePermissions("posts:create"), createPost);
router.put("/posts/:id", authenticate(), authorizePermissions("posts:update"), updatePost);
router.delete("/posts/:id", authenticate(), authorizePermissions("posts:delete"), deletePost);
router.post("/posts/:id/reactions", authenticate(), authorizePermissions("posts:view"), reactToPost);

export default router;
