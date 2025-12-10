import { Router } from "express";

import {
  getProfile,
  getSidebarOld,
  login,
  requestOtp,
  updateProfile,
  updateProfileImage
} from "../controllers/authController";
import { authenticate } from "../middlewares/authMiddleware";
import { profileImageUpload } from "../middlewares/profileUploadMiddleware";

const router = Router();

router.post("/request-otp", requestOtp);
router.post("/login", login);
router.get("/profile", authenticate(), getProfile);
router.patch("/profile", authenticate(), updateProfile);
router.patch("/profile/image", authenticate(), profileImageUpload, updateProfileImage);
router.get("/sidebar_old", authenticate(), getSidebarOld);

export default router;
