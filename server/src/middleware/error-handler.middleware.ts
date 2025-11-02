import { ApiError } from "@/utils/api-error.js";
import { logger } from "@/utils/logger.js";
import type { Request, Response, NextFunction } from "express";

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof ApiError) {
    if (err.status < 500) {
      logger.warn(
        {
          err,
          req: { method: req.method, url: req.url, body: req.body },
        },
        `API Error: ${err.message}`
      );
    } else {
      logger.error(
        {
          err,
          req: { method: req.method, url: req.url, body: req.body },
        },
        `API Error: ${err.message}`
      );
    }

    return res.status(err.status).json({
      success: false,
      message: err.message,
      code: err.code,
      details: err.details,
      errors: err.errors,
    });
  }

  if (err instanceof Error) {
    logger.error(
      {
        err,
        stack: err.stack,
        req: { method: req.method, url: req.url, body: req.body },
      },
      `Unhandled Error: ${err.message}`
    );
  } else {
    const unknownError = new Error("An unknown error occurred");
    logger.error(
      {
        err: unknownError,
        req: { method: req.method, url: req.url, body: req.body },
      },
      `Unhandled non-Error: ${unknownError.message}`
    );
  }

  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
    code: "INTERNAL_SERVER_ERROR",
  });
};
