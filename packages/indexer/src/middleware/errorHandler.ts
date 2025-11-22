import { Request, Response, NextFunction } from "express";

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

/**
 * Custom error class for application errors
 */
export class AppError extends Error implements AppError {
  statusCode: number;
  code: string;
  isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = "INTERNAL_ERROR"
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error handling middleware
 */
export function errorHandler(
  err: AppError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log error
  console.error("Error:", {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });

  // Determine status code
  const statusCode =
    err instanceof AppError ? err.statusCode : 500;
  const code = err instanceof AppError ? err.code : "INTERNAL_ERROR";

  // Send error response
  res.status(statusCode).json({
    error: {
      message:
        process.env.NODE_ENV === "production"
          ? "An error occurred"
          : err.message,
      code,
      ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
    },
  });
}

/**
 * Async error wrapper
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: {
      message: "Resource not found",
      code: "NOT_FOUND",
      path: req.path,
    },
  });
}

