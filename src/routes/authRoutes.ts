import { Router } from "express";

import { getSidebar, login, requestOtp, updateProfile } from "../controllers/authController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

router.post("/request-otp", requestOtp);
router.post("/login", login);
router.patch("/profile", authenticate(), updateProfile);
router.get("/sidebar", authenticate(), getSidebar);

export default router;
