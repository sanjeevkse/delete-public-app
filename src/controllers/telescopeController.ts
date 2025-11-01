import type { Request, Response } from "express";
import telescopeService from "../services/telescopeService";
import path from "path";

export const getRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit, offset, method, statusCode, userId, search } = req.query;

    const filters: any = {
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0
    };

    if (method) filters.method = method as string;
    if (statusCode) filters.statusCode = parseInt(statusCode as string);
    if (userId) filters.userId = parseInt(userId as string);
    if (search) filters.search = search as string;

    const result = await telescopeService.getRequests(filters);

    res.json({
      success: true,
      data: {
        requests: result.rows,
        total: result.count,
        limit: filters.limit,
        offset: filters.offset
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch requests",
        details: error
      }
    });
  }
};

export const getRequestById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { uuid } = req.params;

    const request = await telescopeService.getRequestById(uuid);

    if (!request) {
      res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Request not found"
        }
      });
      return;
    }

    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch request",
        details: error
      }
    });
  }
};

export const getExceptions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit, offset, type } = req.query;

    const filters: any = {
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0
    };

    if (type) filters.type = type as string;

    const result = await telescopeService.getExceptions(filters);

    res.json({
      success: true,
      data: {
        exceptions: result.rows,
        total: result.count,
        limit: filters.limit,
        offset: filters.offset
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch exceptions",
        details: error
      }
    });
  }
};

export const getExceptionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { uuid } = req.params;

    const exception = await telescopeService.getExceptionById(uuid);

    if (!exception) {
      res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Exception not found"
        }
      });
      return;
    }

    res.json({
      success: true,
      data: exception
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch exception",
        details: error
      }
    });
  }
};

export const clearRequests = async (_req: Request, res: Response): Promise<void> => {
  try {
    const count = await telescopeService.clearAllRequests();

    res.json({
      success: true,
      data: {
        message: `Cleared ${count} request(s)`,
        count
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to clear requests",
        details: error
      }
    });
  }
};

export const clearExceptions = async (_req: Request, res: Response): Promise<void> => {
  try {
    const count = await telescopeService.clearAllExceptions();

    res.json({
      success: true,
      data: {
        message: `Cleared ${count} exception(s)`,
        count
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to clear exceptions",
        details: error
      }
    });
  }
};

export const getQueries = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit, offset, requestId, minDuration } = req.query;

    const filters: any = {
      limit: limit ? parseInt(limit as string) : 100,
      offset: offset ? parseInt(offset as string) : 0
    };

    if (requestId) filters.requestId = parseInt(requestId as string);
    if (minDuration) filters.minDuration = parseInt(minDuration as string);

    const result = await telescopeService.getQueries(filters);

    res.json({
      success: true,
      data: {
        queries: result.queries,
        total: result.total,
        limit: filters.limit,
        offset: filters.offset
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch queries",
        details: error
      }
    });
  }
};

export const getQueriesForRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { requestId } = req.params;

    const queries = await telescopeService.getQueriesByRequestId(parseInt(requestId));

    res.json({
      success: true,
      data: {
        queries,
        count: queries.length,
        totalDuration: queries.reduce((sum, q) => sum + q.duration, 0)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch queries for request",
        details: error
      }
    });
  }
};

export const getSlowQueries = async (req: Request, res: Response): Promise<void> => {
  try {
    const { threshold } = req.query;
    const thresholdMs = threshold ? parseInt(threshold as string) : 100;

    const queries = await telescopeService.getSlowQueries(thresholdMs);

    res.json({
      success: true,
      data: {
        queries,
        count: queries.length,
        threshold: thresholdMs
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch slow queries",
        details: error
      }
    });
  }
};

export const clearQueries = async (_req: Request, res: Response): Promise<void> => {
  try {
    const count = await telescopeService.clearQueries();

    res.json({
      success: true,
      data: {
        message: `Cleared ${count} quer(ies)`,
        count
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to clear queries",
        details: error
      }
    });
  }
};

export const serveDashboard = (_req: Request, res: Response): void => {
  const dashboardPath = path.join(__dirname, "../../telescope/dashboard.html");
  res.sendFile(dashboardPath);
};
