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

export const serveDashboard = (_req: Request, res: Response): void => {
  const dashboardPath = path.join(__dirname, "../../telescope/dashboard.html");
  res.sendFile(dashboardPath);
};
