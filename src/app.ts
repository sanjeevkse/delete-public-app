import cors from "cors";
import express from "express";

import apiRateLimiter from "./middlewares/rateLimiter";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";
import { lensMiddleware } from "./middlewares/lensTracker";
import { requestLogger } from "./middlewares/requestLogger";
import routes from "./routes";
import env from "./config/env";
import { ensureDirectory } from "./utils/fileStorage";

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use(apiRateLimiter);
app.use(lensMiddleware());
ensureDirectory(env.uploads.baseDir);
app.use(env.uploads.publicPath, express.static(env.uploads.baseDir));

app.use("/api", routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
