export class AppError extends Error {
  public type: string;
  public statusCode: number;
  public isOperational: boolean;
  public code?: string | undefined;

  constructor(statusCode: number, message: string, code?: string) {
    super(message);
    this.type = "app";
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}
