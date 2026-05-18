import type { NextFunction, Request, Response } from "express";
import { config } from "../config.js";
import { AppError } from "./errorHandler.js";

export function requireApiKey(req: Request, _res: Response, next: NextFunction): void {
  if (!config.apiSecretKey) {
    next();
    return;
  }

  const header = req.headers.authorization;
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  const apiKey = (req.headers["x-api-key"] as string | undefined) ?? bearer;

  if (apiKey !== config.apiSecretKey) {
    next(new AppError(401, "unauthorized", "Invalid or missing API key"));
    return;
  }

  next();
}
