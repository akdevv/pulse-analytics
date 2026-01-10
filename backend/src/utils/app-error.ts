export class AppError extends Error {
  public type: string;
  public statusCode: number;
  public isOperational: boolean;

  constructor(statusCode: number, message: string) {
    super(message);
    this.type = "app";
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}
