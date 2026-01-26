import { Router } from "express";

import {
  getProfile,
  getSidebar,
  login,
  logout,
  requestOtp,
  updateProfile,
  updateProfileImage
} from "../controllers/authController";
import { authenticate } from "../middlewares/authMiddleware";
import { profileImageUpload } from "../middlewares/profileUploadMiddleware";

const router = Router();

router.post("/request-otp", requestOtp);
router.post("/login", login);
router.post("/logout", authenticate(), logout);
router.get("/profile", authenticate(), getProfile);
router.patch("/profile", authenticate(), updateProfile);
router.patch("/profile/image", authenticate(), profileImageUpload, updateProfileImage);
router.get("/sidebar", authenticate(), getSidebar);

export default router;
