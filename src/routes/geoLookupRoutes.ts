import express from "express";

import { getGeoLookup } from "../controllers/geoLookupController";
import { authenticateOptional } from "../middlewares/authMiddleware";

const router = express.Router();

router.get("/geo-lookup", authenticateOptional(), getGeoLookup);

export default router;
