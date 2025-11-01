import { AsyncLocalStorage } from "async_hooks";

// Store to track current request context for linking queries to requests
export const requestContextStore = new AsyncLocalStorage<{
  requestId: number | null;
  startTime: number;
  correlationId?: string;
}>();

// Query timing store
const queryTimings = new Map<string, number>();

/**
 * Sequelize query logger hook
 * Captures SQL queries with timing information
 */
export function queryLogger(sql: string, timing?: number): void {
  const queryId = `${Date.now()}-${Math.random()}`;

  if (timing === undefined) {
    // Query starting - record start time
    queryTimings.set(queryId, Date.now());
  } else {
    // Query finished - calculate duration and log
    const startTime = queryTimings.get(queryId);
    if (startTime) {
      const duration = Date.now() - startTime;
      queryTimings.delete(queryId);

      // Get current request context
      const context = requestContextStore.getStore();

      // Queue query for logging (imported dynamically to avoid circular dependency)
      setImmediate(async () => {
        try {
          const { default: telescopeService } = await import("../services/telescopeService");
          await telescopeService.logQuery({
            sql,
            duration,
            requestId: context?.requestId || null,
            bindings: extractBindings(sql)
          });
        } catch (error) {
          // Silent fail - don't break the app if telescope logging fails
        }
      });
    }
  }
}

/**
 * Extract bindings from SQL query (basic implementation)
 * Sequelize formats queries with ? or :param placeholders
 */
function extractBindings(sql: string): any[] | null {
  const matches = sql.match(/\?|:\w+/g);
  return matches && matches.length > 0 ? matches : null;
}

/**
 * Benchmark logger for Sequelize
 * Logs query execution time
 */
export function benchmarkLogger(sql: string, timing: number): void {
  // Get current request context
  const context = requestContextStore.getStore();

  // Queue query for logging
  setImmediate(async () => {
    try {
      const { default: telescopeService } = await import("../services/telescopeService");
      await telescopeService.logQuery({
        sql,
        duration: timing,
        requestId: context?.requestId || null,
        correlationId: context?.correlationId || null,
        bindings: extractBindings(sql)
      });
    } catch (error) {
      // Silent fail
    }
  });
}
