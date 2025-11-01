import cors from "cors";
import express from "express";

import apiRateLimiter from "./middlewares/rateLimiter";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";
import { lensMiddleware } from "./middlewares/lensTracker";
import { requestLogger } from "./middlewares/requestLogger";
import { telescopeMiddleware } from "./middlewares/telescopeMiddleware";
import routes from "./routes";
import telescopeRoutes from "./routes/telescopeRoutes";
import { UPLOAD_PATHS } from "./config/uploadConstants";
import { ensureDirectory } from "./utils/fileStorage";

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use(telescopeMiddleware);
app.use(apiRateLimiter);
app.use(lensMiddleware());
ensureDirectory(UPLOAD_PATHS.BASE_DIR);
app.use(UPLOAD_PATHS.PUBLIC_PATH, express.static(UPLOAD_PATHS.BASE_DIR));

// Telescope monitoring dashboard
app.use("/telescope", telescopeRoutes);

app.use("/api", routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
