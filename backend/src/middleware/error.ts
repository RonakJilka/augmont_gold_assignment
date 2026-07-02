import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { HttpError } from "../utils/httpError";
import { logger } from "../utils/logger";
import { env } from "../config/env";

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Invalid input", details: err.flatten() },
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      res.status(409).json({
        error: {
          code: "CONFLICT",
          message: "Unique constraint violated",
          details: err.meta,
        },
      });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({
        error: { code: "NOT_FOUND", message: "Record not found" },
      });
      return;
    }
  }

  logger.error({ err }, "unhandled error");
  const body: { error: { code: string; message: string; stack?: string } } = {
    error: { code: "INTERNAL_ERROR", message: "Something went wrong" },
  };
  if (env.NODE_ENV !== "production" && err instanceof Error) {
    body.error.stack = err.stack;
  }
  res.status(500).json(body);
};
