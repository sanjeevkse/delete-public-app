import { Router } from "express";

import { login, register, requestOtp } from "../controllers/authController";

const router = Router();

router.post("/request-otp", requestOtp);
router.post("/register", register);
router.post("/login", login);

export default router;
