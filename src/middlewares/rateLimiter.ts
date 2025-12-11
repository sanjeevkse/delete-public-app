import rateLimit from "express-rate-limit";

// Disable rate limiting in test environment
const apiRateLimiter =
  process.env.NODE_ENV === "test"
    ? (_req: any, _res: any, next: any) => next()
    : rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 1000,
        standardHeaders: true,
        legacyHeaders: false,
        message: "Too many requests, please try again later."
      });

export default apiRateLimiter;
