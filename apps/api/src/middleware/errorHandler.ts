import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      details: err.details ?? {},
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: "validation_error",
      message: "Invalid request body",
      details: { issues: err.issues },
    });
    return;
  }

  const expose =
    process.env.API_DEBUG_ERRORS === "true" ||
    process.env.NODE_ENV !== "production";
  const message =
    err instanceof Error ? err.message : "An unexpected error occurred";

  console.error(err);

  res.status(500).json({
    error: "internal_error",
    message: expose ? message : "An unexpected error occurred",
    details: expose && err instanceof Error ? { name: err.name } : {},
  });
}
