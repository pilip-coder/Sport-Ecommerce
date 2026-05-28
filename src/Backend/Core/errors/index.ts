import { NextFunction, Request, Response } from "express";
import { environment } from "../../Config/environment";

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json({ message: "Route not found." });
};

export const errorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  console.error(error);
  if (environment.nodeEnv !== "production") {
    res.status(500).json({
      message: "Internal server error.",
      error: error.message,
    });
    return;
  }

  res.status(500).json({ message: "Internal server error." });
};
