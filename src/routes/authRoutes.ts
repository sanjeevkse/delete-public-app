import { Router } from "express";

import { login, requestOtp, updateProfile } from "../controllers/authController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

router.post("/request-otp", requestOtp);
router.post("/login", login);
router.patch("/profile", authenticate(), updateProfile);

export default router;
