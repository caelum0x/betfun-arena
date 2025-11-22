import { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler";

/**
 * Request validation middleware using simple validation
 * For production, use Zod or Joi
 */

export function validateQuery(schema: Record<string, (value: any) => boolean>) {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const [key, validator] of Object.entries(schema)) {
      const value = req.query[key];
      if (value !== undefined && !validator(value)) {
        throw new AppError(
          `Invalid query parameter: ${key}`,
          400,
          "VALIDATION_ERROR"
        );
      }
    }
    next();
  };
}

export function validateBody(schema: Record<string, (value: any) => boolean>) {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const [key, validator] of Object.entries(schema)) {
      const value = req.body[key];
      if (value !== undefined && !validator(value)) {
        throw new AppError(
          `Invalid body parameter: ${key}`,
          400,
          "VALIDATION_ERROR"
        );
      }
    }
    next();
  };
}

export function validateParams(schema: Record<string, (value: any) => boolean>) {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const [key, validator] of Object.entries(schema)) {
      const value = req.params[key];
      if (value !== undefined && !validator(value)) {
        throw new AppError(
          `Invalid path parameter: ${key}`,
          400,
          "VALIDATION_ERROR"
        );
      }
    }
    next();
  };
}

// Common validators
export const validators = {
  string: (value: any) => typeof value === "string",
  number: (value: any) => !isNaN(Number(value)),
  positiveNumber: (value: any) => {
    const num = Number(value);
    return !isNaN(num) && num > 0;
  },
  nonNegativeNumber: (value: any) => {
    const num = Number(value);
    return !isNaN(num) && num >= 0;
  },
  boolean: (value: any) => typeof value === "boolean" || value === "true" || value === "false",
  solanaAddress: (value: any) => {
    if (typeof value !== "string") return false;
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
  },
  signature: (value: any) => {
    if (typeof value !== "string") return false;
    return value.length === 88; // Base58 encoded signature
  },
};

