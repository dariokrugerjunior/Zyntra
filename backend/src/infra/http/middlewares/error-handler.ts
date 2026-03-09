import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "../../../shared/errors/http-error";
import { logger } from "../../../shared/utils/logger";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "validation_error", details: err.flatten() });
  }

  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({ error: err.message, details: err.details ?? null });
  }

  logger.error({ err }, "unexpected error");
  return res.status(500).json({ error: "internal_server_error" });
}
