import cors from "cors";
import express from "express";
import path from "path";

import apiRateLimiter from "./middlewares/rateLimiter";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";
import { requestLogger } from "./middlewares/requestLogger";
import { telescopeMiddleware } from "./middlewares/telescopeMiddleware";
import { sanitizeAuditFields } from "./middlewares/sanitizeAuditFields";
import routes from "./routes";
import telescopeRoutes from "./routes/telescopeRoutes";
import adminRoutes from "./routes/adminRoutes";
import { UPLOAD_PATHS } from "./config/uploadConstants";
import { ensureDirectory } from "./utils/fileStorage";

const app = express();

// Set view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeAuditFields);
app.use(requestLogger);
app.use(telescopeMiddleware);
app.use(apiRateLimiter);
ensureDirectory(UPLOAD_PATHS.BASE_DIR);
app.use(UPLOAD_PATHS.PUBLIC_PATH, express.static(UPLOAD_PATHS.BASE_DIR));

// Serve static files from public directory
app.use("/public", express.static(path.join(__dirname, "../public")));

// Firebase test portal
app.get("/firebase-test", (_req, res) => {
  res.sendFile(path.join(__dirname, "../public/firebase-test.html"));
});

// Role & Permission Manager UI
app.get("/role-permission-manager", (_req, res) => {
  res.sendFile(path.join(__dirname, "../public/role-permission-manager.html"));
});

// Sidebar CRUD UI
app.get("/sidebar-crud", (_req, res) => {
  res.sendFile(path.join(__dirname, "../public/sidebar-crud.html"));
});

// Admin dashboard routes
app.use("/admin", adminRoutes);

// Telescope monitoring dashboard
app.use("/telescope", telescopeRoutes);

app.use("/api", routes);

let errorHandlersRegistered = false;

export const registerErrorHandlers = (): void => {
  if (errorHandlersRegistered) {
    return;
  }
  app.use(notFoundHandler);
  app.use(errorHandler);
  errorHandlersRegistered = true;
};

export default app;
