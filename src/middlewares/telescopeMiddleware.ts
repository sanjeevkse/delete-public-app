import type { NextFunction, Request, Response } from "express";
import telescopeService from "../services/telescopeService";
import { requestContextStore } from "../config/queryLogger";

// Extend Express Request to store telescope data
declare module "express-serve-static-core" {
  interface Request {
    telescopeStartTime?: number;
    telescopeExceptionId?: number;
    telescopeRequestId?: number;
    telescopeCorrelationId?: string;
  }
}

export const telescopeMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Skip if telescope is disabled or path should not be captured
  if (!telescopeService.isEnabled() || !telescopeService.shouldCapture(req.path)) {
    return next();
  }

  // Store start time and create a unique correlation ID for this request
  req.telescopeStartTime = Date.now();
  const correlationId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  req.telescopeCorrelationId = correlationId;

  // Run the rest in async context to track queries
  // Store correlation ID instead of requestId for now
  requestContextStore.run({ requestId: null, startTime: Date.now(), correlationId }, () => {
    runMiddleware(req, res, next);
  });
};

const runMiddleware = (req: Request, res: Response, next: NextFunction): void => {
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

      // Capture file upload information
      const bodyWithFiles: any = { ...req.body };

      // Handle single file upload (req.file from multer)
      if ((req as any).file) {
        const file = (req as any).file;
        bodyWithFiles.__file = {
          fieldname: file.fieldname,
          originalname: file.originalname,
          encoding: file.encoding,
          mimetype: file.mimetype,
          size: file.size,
          filename: file.filename,
          path: file.path
        };
      }

      // Handle multiple file uploads (req.files from multer)
      if ((req as any).files) {
        const files = (req as any).files;
        if (Array.isArray(files)) {
          // Array of files
          bodyWithFiles.__files = files.map((file: any) => ({
            fieldname: file.fieldname,
            originalname: file.originalname,
            encoding: file.encoding,
            mimetype: file.mimetype,
            size: file.size,
            filename: file.filename,
            path: file.path
          }));
        } else {
          // Object with field names as keys
          bodyWithFiles.__files = {};
          for (const fieldname in files) {
            bodyWithFiles.__files[fieldname] = files[fieldname].map((file: any) => ({
              originalname: file.originalname,
              encoding: file.encoding,
              mimetype: file.mimetype,
              size: file.size,
              filename: file.filename,
              path: file.path
            }));
          }
        }
      }

      const telescopeRequest = await telescopeService.logRequest({
        method: req.method,
        path: req.path,
        fullUrl,
        statusCode: res.statusCode,
        duration,
        ipAddress,
        userAgent: req.get("user-agent") || null,
        headers: req.headers,
        queryParams: req.query,
        bodyParams: bodyWithFiles,
        responseBody: parsedResponseBody,
        responseHeaders: res.getHeaders(),
        userId,
        exceptionId: req.telescopeExceptionId || null
      });

      // Link queries that were logged with the correlation ID to this request
      if (telescopeRequest && req.telescopeCorrelationId) {
        req.telescopeRequestId = telescopeRequest.id;

        // Update queries with the actual request ID
        await telescopeService.linkQueriesByCorrelationId(
          req.telescopeCorrelationId,
          telescopeRequest.id
        );
      }
    } catch (error) {
      // Silently fail to avoid breaking the application
      console.error("Telescope middleware error:", error);
    }
  });

  next();
};
