import { Router } from "express";
import * as telescopeController from "../controllers/telescopeController";

const router = Router();

// Dashboard UI
router.get("/", telescopeController.serveDashboard);

// API endpoints
router.get("/api/requests", telescopeController.getRequests);
router.get("/api/requests/:uuid", telescopeController.getRequestById);
router.get("/api/exceptions", telescopeController.getExceptions);
router.get("/api/exceptions/:uuid", telescopeController.getExceptionById);
router.delete("/api/requests", telescopeController.clearRequests);
router.delete("/api/exceptions", telescopeController.clearExceptions);

// Query endpoints
router.get("/api/queries", telescopeController.getQueries);
router.get("/api/queries/request/:requestId", telescopeController.getQueriesForRequest);
router.get("/api/queries/slow", telescopeController.getSlowQueries);
router.delete("/api/queries", telescopeController.clearQueries);

export default router;
