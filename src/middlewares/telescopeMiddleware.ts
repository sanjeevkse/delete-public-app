import type { NextFunction, Request, Response } from "express";
import telescopeService from "../services/telescopeService";

// Extend Express Request to store telescope data
declare global {
  namespace Express {
    interface Request {
      telescopeStartTime?: number;
      telescopeExceptionId?: number;
    }
  }
}

export const telescopeMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Skip if telescope is disabled
  if (!telescopeService.isEnabled()) {
    return next();
  }

  // Store start time
  req.telescopeStartTime = Date.now();

  // Capture original response methods
  const originalSend = res.send;
  const originalJson = res.json;
  let responseBody: any = null;

  // Override res.send to capture response body
  res.send = function (body: any): Response {
    responseBody = body;
    return originalSend.call(this, body);
  };

  // Override res.json to capture response body
  res.json = function (body: any): Response {
    responseBody = body;
    return originalJson.call(this, body);
  };

  // Log request when response finishes
  res.on("finish", async () => {
    try {
      const duration = Date.now() - (req.telescopeStartTime || Date.now());

      // Extract user ID if available (assuming it's set by auth middleware)
      const userId = (req as any).user?.id || null;

      // Get IP address
      const ipAddress =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
        req.socket.remoteAddress ||
        null;

      // Parse response body if it's a string
      let parsedResponseBody = responseBody;
      if (typeof responseBody === "string") {
        try {
          parsedResponseBody = JSON.parse(responseBody);
        } catch {
          // If parsing fails, keep as string
          parsedResponseBody = responseBody;
        }
      }

      // Build full URL
      const protocol = req.protocol;
      const host = req.get("host");
      const fullUrl = `${protocol}://${host}${req.originalUrl}`;

      await telescopeService.logRequest({
        method: req.method,
        path: req.path,
        fullUrl,
        statusCode: res.statusCode,
        duration,
        ipAddress,
        userAgent: req.get("user-agent") || null,
        headers: req.headers,
        queryParams: req.query,
        bodyParams: req.body,
        responseBody: parsedResponseBody,
        responseHeaders: res.getHeaders(),
        userId,
        exceptionId: req.telescopeExceptionId || null
      });
    } catch (error) {
      // Silently fail to avoid breaking the application
      console.error("Telescope middleware error:", error);
    }
  });

  next();
};
