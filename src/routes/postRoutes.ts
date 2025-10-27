import { Router } from "express";

import {
  createPost,
  deletePost,
  getPost,
  listMyPosts,
  listPosts,
  addPostMedia,
  removePostMedia,
  reactToPost,
  updatePost
} from "../controllers/postController";
import { authenticate } from "../middlewares/authMiddleware";
import { authorizePermissions } from "../middlewares/authorizationMiddleware";
import { postMediaUpload } from "../middlewares/postUploadMiddleware";

const router = Router();

router.get("/posts", authenticate(), authorizePermissions("posts:list"), listPosts);
router.get("/posts/:id", authenticate(), authorizePermissions("posts:view"), getPost);
router.get("/my-posts", authenticate(), authorizePermissions("posts:view"), listMyPosts);
router.post(
  "/posts",
  authenticate(),
  authorizePermissions("posts:create"),
  postMediaUpload,
  createPost
);
router.put("/posts/:id", authenticate(), authorizePermissions("posts:update"), updatePost);
router.delete("/posts/:id", authenticate(), authorizePermissions("posts:delete"), deletePost);
router.post(
  "/posts/:id/reactions",
  authenticate(),
  authorizePermissions("posts:view"),
  reactToPost
);
router.post(
  "/posts/:id/media",
  authenticate(),
  authorizePermissions("posts:update"),
  postMediaUpload,
  addPostMedia
);
router.delete(
  "/posts/:id/media",
  authenticate(),
  authorizePermissions("posts:update"),
  removePostMedia
);

export default router;
