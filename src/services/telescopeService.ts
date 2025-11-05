import { randomUUID } from "crypto";
import TelescopeRequest from "../models/TelescopeRequest";
import TelescopeException from "../models/TelescopeException";
import TelescopeQuery from "../models/TelescopeQuery";
import logger from "../utils/logger";

interface TelescopeConfig {
  enabled: boolean;
  storageLimit: number; // Maximum number of entries to keep
  excludePaths: string[];
  captureRequestBody: boolean;
  captureResponseBody: boolean;
  captureHeaders: boolean;
  maxBodySize: number; // Maximum size of body to store in bytes
}

const defaultConfig: TelescopeConfig = {
  enabled: process.env.TELESCOPE_ENABLED !== "false",
  storageLimit: 1000,
  excludePaths: ["/telescope", "/uploads"],
  captureRequestBody: true,
  captureResponseBody: true,
  captureHeaders: true,
  maxBodySize: 100000 // 100KB
};

class TelescopeService {
  private config: TelescopeConfig;

  constructor(config: Partial<TelescopeConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  shouldCapture(path: string): boolean {
    if (!this.isEnabled()) return false;
    return !this.config.excludePaths.some((excluded) => path.startsWith(excluded));
  }

  async logRequest(data: {
    method: string;
    path: string;
    fullUrl: string;
    statusCode: number;
    duration: number;
    ipAddress: string | null;
    userAgent: string | null;
    headers: object;
    queryParams: object;
    bodyParams: object;
    responseBody: object | null;
    responseHeaders: object | null;
    userId: number | null;
    exceptionId?: number | null;
  }): Promise<TelescopeRequest | null> {
    if (!this.shouldCapture(data.path)) {
      return null;
    }

    try {
      // Sanitize and limit data size
      const sanitizedData = {
        uuid: randomUUID(),
        method: data.method,
        path: data.path,
        fullUrl: data.fullUrl.substring(0, 1000), // Limit URL length
        statusCode: data.statusCode,
        duration: data.duration,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent?.substring(0, 500),
        headers: this.config.captureHeaders ? this.sanitizeData(data.headers) : {},
        queryParams: this.sanitizeData(data.queryParams),
        bodyParams: this.config.captureRequestBody
          ? this.sanitizeData(data.bodyParams, this.config.maxBodySize)
          : {},
        responseBody: this.config.captureResponseBody
          ? this.sanitizeData(data.responseBody, this.config.maxBodySize)
          : null,
        responseHeaders: this.config.captureHeaders
          ? this.sanitizeData(data.responseHeaders)
          : null,
        userId: data.userId,
        exceptionId: data.exceptionId || null
      };

      const request = await TelescopeRequest.create(sanitizedData);

      // Cleanup old entries if storage limit exceeded
      await this.cleanupOldEntries();

      return request;
    } catch (error) {
      logger.error({ error }, "Failed to log request to Telescope");
      return null;
    }
  }

  async logException(error: Error, context?: object): Promise<TelescopeException | null> {
    if (!this.isEnabled()) {
      return null;
    }

    try {
      const stackLines = error.stack?.split("\n") || [];
      let file: string | null = null;
      let line: number | null = null;

      // Parse stack trace to get file and line number
      if (stackLines.length > 1) {
        const match = stackLines[1].match(/\((.+):(\d+):(\d+)\)/);
        if (match) {
          file = match[1];
          line = parseInt(match[2], 10);
        } else {
          const altMatch = stackLines[1].match(/at\s+(.+):(\d+):(\d+)/);
          if (altMatch) {
            file = altMatch[1];
            line = parseInt(altMatch[2], 10);
          }
        }
      }

      const exceptionData = {
        uuid: randomUUID(),
        type: error.constructor.name,
        message: error.message,
        code: (error as any).code || null,
        file,
        line,
        stackTrace: error.stack || null,
        context: context ? this.sanitizeData(context) : null
      };

      const exception = await TelescopeException.create(exceptionData);
      return exception;
    } catch (err) {
      logger.error({ err }, "Failed to log exception to Telescope");
      return null;
    }
  }

  async getRequests(
    filters: {
      limit?: number;
      offset?: number;
      method?: string;
      statusCode?: number;
      userId?: number;
      search?: string;
    } = {}
  ): Promise<{ rows: TelescopeRequest[]; count: number }> {
    const where: any = {};

    if (filters.method) where.method = filters.method;
    if (filters.statusCode) where.statusCode = filters.statusCode;
    if (filters.userId) where.userId = filters.userId;

    const { rows, count } = await TelescopeRequest.findAndCountAll({
      where,
      limit: filters.limit || 50,
      offset: filters.offset || 0,
      order: [["createdAt", "DESC"]]
    });

    return { rows, count };
  }

  async getRequestById(uuid: string): Promise<TelescopeRequest | null> {
    return await TelescopeRequest.findOne({ where: { uuid } });
  }

  async getExceptions(
    filters: {
      limit?: number;
      offset?: number;
      type?: string;
    } = {}
  ): Promise<{ rows: TelescopeException[]; count: number }> {
    const where: any = {};

    if (filters.type) where.type = filters.type;

    const { rows, count } = await TelescopeException.findAndCountAll({
      where,
      limit: filters.limit || 50,
      offset: filters.offset || 0,
      order: [["createdAt", "DESC"]]
    });

    return { rows, count };
  }

  async getExceptionById(uuid: string): Promise<TelescopeException | null> {
    return await TelescopeException.findOne({ where: { uuid } });
  }

  async clearAllRequests(): Promise<number> {
    return await TelescopeRequest.destroy({ where: {}, truncate: true });
  }

  async clearAllExceptions(): Promise<number> {
    return await TelescopeException.destroy({ where: {}, truncate: true });
  }

  private sanitizeData(data: any, maxSize?: number): any {
    if (!data) return data;

    try {
      // Handle special cases that can't be JSON.stringified
      if (typeof data === "function") {
        return "[Function]";
      }

      if (data instanceof Buffer) {
        return {
          __type: "Buffer",
          __size: data.length,
          __preview: data.toString("utf8", 0, Math.min(100, data.length))
        };
      }

      // Handle circular references and non-serializable objects
      const seen = new WeakSet();
      const replacer = (key: string, value: any) => {
        if (typeof value === "object" && value !== null) {
          if (seen.has(value)) {
            return "[Circular Reference]";
          }
          seen.add(value);

          // Handle special object types
          if (value instanceof Date) {
            return value.toISOString();
          }
          if (value instanceof RegExp) {
            return value.toString();
          }
          if (value instanceof Error) {
            return { name: value.name, message: value.message, stack: value.stack };
          }
          if (Buffer.isBuffer(value)) {
            return { __type: "Buffer", __size: value.length };
          }
        }
        return value;
      };

      let jsonString = JSON.stringify(data, replacer);

      // Limit size if specified
      if (maxSize && jsonString.length > maxSize) {
        jsonString = jsonString.substring(0, maxSize) + "... [truncated]";
        return { __truncated: true, data: jsonString };
      }

      // Parse back to object and remove sensitive data
      const parsed = JSON.parse(jsonString);
      const sensitiveKeys = ["password", "token", "secret", "authorization", "cookie", "api_key"];
      const sanitized = this.removeSensitiveKeys(parsed, sensitiveKeys);

      return sanitized;
    } catch (error) {
      // If all else fails, try to extract basic info
      try {
        if (typeof data === "object" && data !== null) {
          const keys = Object.keys(data);
          return {
            __error: "Failed to sanitize data",
            __type: data.constructor?.name || typeof data,
            __keys: keys.slice(0, 10),
            __hasMoreKeys: keys.length > 10
          };
        }
      } catch {
        // Last resort
        return { __error: "Failed to sanitize data", __type: typeof data };
      }
      return { __error: "Failed to sanitize data", __type: typeof data };
    }
  }

  private removeSensitiveKeys(obj: any, sensitiveKeys: string[]): any {
    if (typeof obj !== "object" || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.removeSensitiveKeys(item, sensitiveKeys));
    }

    const sanitized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
          sanitized[key] = "***REDACTED***";
        } else if (typeof obj[key] === "object") {
          sanitized[key] = this.removeSensitiveKeys(obj[key], sensitiveKeys);
        } else {
          sanitized[key] = obj[key];
        }
      }
    }
    return sanitized;
  }

  async logQuery(data: {
    sql: string;
    bindings?: any[] | object | null;
    duration: number;
    requestId?: number | null;
    correlationId?: string | null;
    connectionName?: string;
  }): Promise<TelescopeQuery | null> {
    if (!this.isEnabled()) {
      return null;
    }

    try {
      // Skip logging Telescope's own queries to prevent recursion
      if (
        data.sql.includes("telescope_queries") ||
        data.sql.includes("telescope_requests") ||
        data.sql.includes("telescope_exceptions")
      ) {
        return null;
      }

      const query = await TelescopeQuery.create({
        uuid: randomUUID(),
        sql: data.sql.substring(0, 10000), // Limit SQL length
        bindings: data.bindings ? this.sanitizeData(data.bindings, 5000) : null,
        duration: data.duration,
        requestId: data.requestId || null,
        correlationId: data.correlationId || null,
        connectionName: data.connectionName || "default"
      });

      return query;
    } catch (error) {
      // Silent fail to prevent breaking the application
      return null;
    }
  }

  async linkQueriesByCorrelationId(correlationId: string, requestId: number): Promise<number> {
    try {
      const [affectedCount] = await TelescopeQuery.update(
        { requestId },
        {
          where: {
            correlationId,
            requestId: null
          }
        }
      );
      return affectedCount;
    } catch (error) {
      logger.error({ error }, "Failed to link queries by correlation ID");
      return 0;
    }
  }

  async getQueries(
    options: {
      limit?: number;
      offset?: number;
      requestId?: number;
      minDuration?: number; // Get slow queries
    } = {}
  ): Promise<{ queries: TelescopeQuery[]; total: number }> {
    try {
      const where: any = {};

      if (options.requestId) {
        where.requestId = options.requestId;
      }

      if (options.minDuration) {
        where.duration = { $gte: options.minDuration };
      }

      const { count, rows } = await TelescopeQuery.findAndCountAll({
        where,
        limit: options.limit || 100,
        offset: options.offset || 0,
        order: [["createdAt", "DESC"]]
      });

      return { queries: rows, total: count };
    } catch (error) {
      logger.error({ error }, "Failed to retrieve Telescope queries");
      return { queries: [], total: 0 };
    }
  }

  async getQueriesByRequestId(requestId: number): Promise<TelescopeQuery[]> {
    try {
      return await TelescopeQuery.findAll({
        where: { requestId },
        order: [["createdAt", "ASC"]]
      });
    } catch (error) {
      logger.error({ error }, "Failed to retrieve queries for request");
      return [];
    }
  }

  async getSlowQueries(threshold: number = 100): Promise<TelescopeQuery[]> {
    try {
      return await TelescopeQuery.findAll({
        where: {
          duration: { $gte: threshold }
        },
        limit: 50,
        order: [["duration", "DESC"]]
      });
    } catch (error) {
      logger.error({ error }, "Failed to retrieve slow queries");
      return [];
    }
  }

  async clearQueries(): Promise<number> {
    try {
      return await TelescopeQuery.destroy({ where: {} });
    } catch (error) {
      logger.error({ error }, "Failed to clear Telescope queries");
      return 0;
    }
  }

  private async cleanupOldEntries(): Promise<void> {
    try {
      const count = await TelescopeRequest.count();

      if (count > this.config.storageLimit) {
        const entriesToDelete = count - this.config.storageLimit;

        // Delete oldest entries
        const oldestEntries = await TelescopeRequest.findAll({
          order: [["createdAt", "ASC"]],
          limit: entriesToDelete,
          attributes: ["id"]
        });

        const idsToDelete = oldestEntries.map((entry) => entry.id);

        if (idsToDelete.length > 0) {
          await TelescopeRequest.destroy({ where: { id: idsToDelete } });
        }
      }

      // Cleanup exceptions similarly
      const exceptionCount = await TelescopeException.count();
      if (exceptionCount > this.config.storageLimit) {
        const entriesToDelete = exceptionCount - this.config.storageLimit;

        const oldestExceptions = await TelescopeException.findAll({
          order: [["createdAt", "ASC"]],
          limit: entriesToDelete,
          attributes: ["id"]
        });

        const idsToDelete = oldestExceptions.map((entry) => entry.id);

        if (idsToDelete.length > 0) {
          await TelescopeException.destroy({ where: { id: idsToDelete } });
        }
      }

      // Cleanup queries similarly
      const queryCount = await TelescopeQuery.count();
      if (queryCount > this.config.storageLimit * 10) {
        // Keep more queries as they're smaller
        const entriesToDelete = queryCount - this.config.storageLimit * 10;

        const oldestQueries = await TelescopeQuery.findAll({
          order: [["createdAt", "ASC"]],
          limit: entriesToDelete,
          attributes: ["id"]
        });

        const idsToDelete = oldestQueries.map((entry) => entry.id);

        if (idsToDelete.length > 0) {
          await TelescopeQuery.destroy({ where: { id: idsToDelete } });
        }
      }
    } catch (error) {
      logger.error({ error }, "Failed to cleanup old Telescope entries");
    }
  }
}

// Singleton instance
const telescopeService = new TelescopeService();

export default telescopeService;
export { TelescopeService, TelescopeConfig };
