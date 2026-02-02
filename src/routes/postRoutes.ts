import { Router } from "express";

import {
  createPost,
  deletePost,
  getPost,
  listMyPosts,
  listPosts,
  listPostLikes,
  addPostMedia,
  removePostMedia,
  reactToPost,
  updatePost
} from "../controllers/postController";
import { authenticate } from "../middlewares/authMiddleware";
import { authorizePermissions } from "../middlewares/authorizationMiddleware";
import { postMediaUpload } from "../middlewares/postUploadMiddleware";

const router = Router();

router.get("/posts", authenticate(), listPosts);
router.get("/posts/:id", authenticate(), getPost);
router.get("/posts/:id/likes", authenticate(), listPostLikes);
router.get("/my-posts", authenticate(), listMyPosts);
router.post("/posts", authenticate(), postMediaUpload, createPost);
router.put("/posts/:id", authenticate(), updatePost);
router.delete("/posts/:id", authenticate(), deletePost);
router.post("/posts/:id/reactions", authenticate(), reactToPost);
router.post("/posts/:id/media", authenticate(), postMediaUpload, addPostMedia);
router.delete("/posts/:id/media", authenticate(), removePostMedia);

export default router;
