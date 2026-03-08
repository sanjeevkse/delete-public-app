import { Router } from "express";

import { getCasteRelations } from "../controllers/casteRelationController";
import { authenticateOptional } from "../middlewares/authMiddleware";

const router = Router();

router.get("/caste-relations", authenticateOptional(), getCasteRelations);

export default router;
