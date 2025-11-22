import { Request, Response, NextFunction } from "express";

/**
 * Request logging middleware
 */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const startTime = Date.now();
  const requestId = generateRequestId();

  // Add request ID to request object
  (req as any).requestId = requestId;

  // Log request
  console.log({
    type: "request",
    requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get("user-agent"),
    timestamp: new Date().toISOString(),
  });

  // Log response when finished
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 400 ? "error" : "info";

    console.log({
      type: "response",
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      level: logLevel,
    });
  });

  next();
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Error logger
 */
export function errorLogger(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const requestId = (req as any).requestId || "unknown";

  console.error({
    type: "error",
    requestId,
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name,
    },
    method: req.method,
    url: req.url,
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });

  next(err);
}

