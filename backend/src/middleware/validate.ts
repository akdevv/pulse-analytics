import { ZodError, type ZodSchema } from "zod";
import type { Request, Response, NextFunction } from "express";

// Assigns the parsed value back to req.body so schema transforms (trim,
// lowercase) actually apply and unknown keys are stripped.
export const validate =
  (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return next(new ValidationError(result.error));
    }

    req.body = result.data;
    next();
  };

// Carries field errors so the error middleware needn't know about Zod.
export class ValidationError extends Error {
  public readonly type = "app";
  public readonly statusCode = 400;
  public readonly code = "VALIDATION_ERROR";
  public readonly fields: Record<string, string[] | undefined>;

  constructor(error: ZodError) {
    super("Validation error");
    this.fields = error.flatten().fieldErrors;
  }
}
