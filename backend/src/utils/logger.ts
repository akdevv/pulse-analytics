import env from "@/config/env.ts";
import { type Request, type Response } from "express";

export enum LogLevel {
  ERROR = "ERROR",
  WARN = "WARN",
  INFO = "INFO",
  DEBUG = "DEBUG",
}

interface RequestMetadata {
  [key: string]: unknown;
  method: string;
  path: string;
  ip?: string | undefined;
  userAgent?: string | undefined;
  userId?: string | undefined;
}

interface ResponseMetadata extends RequestMetadata {
  statusCode: number;
  responseTime: string;
}

const isDevelopment = env.NODE_ENV === "development";

function formatLog(
  level: LogLevel,
  msg: string,
  meta: Record<string, unknown> = {}
) {
  const timestamp = new Date().toISOString();
  return {
    timestamp,
    level,
    msg,
    ...meta,
  };
}

function log(level: LogLevel, msg: string, meta: Record<string, unknown> = {}) {
  const logEntry = formatLog(level, msg, meta);

  if (isDevelopment) {
    const colors: Record<LogLevel, string> = {
      [LogLevel.ERROR]: "\x1b[31m", // Red
      [LogLevel.WARN]: "\x1b[33m", // Yellow
      [LogLevel.INFO]: "\x1b[36m", // Cyan
      [LogLevel.DEBUG]: "\x1b[90m", // Gray
    };
    const reset = "\x1b[0m";
    const color = colors[level] || "";

    console.log(
      `${color}[${logEntry.timestamp}] ${level}:${reset} ${msg}`,
      Object.keys(meta).length > 0 ? meta : ""
    );
  } else {
    console.log(JSON.stringify(logEntry));
  }
}

function error(
  msg: string,
  err?: Error | null,
  meta: Record<string, unknown> = {}
): void {
  const errorMeta: {
    [key: string]: unknown;
    error?: {
      msg: string;
      stack?: string;
      name?: string;
      [key: string]: unknown;
    };
  } = {
    ...meta,
  };

  if (err) {
    errorMeta.error = {
      msg: err.message,
      stack: err.stack || "",
      name: err.name,
      ...(err as unknown as Record<string, unknown>),
    };
  }

  log(LogLevel.ERROR, msg, errorMeta);
}

function warn(msg: string, meta: Record<string, unknown> = {}) {
  log(LogLevel.WARN, msg, meta);
}

function info(msg: string, meta: Record<string, unknown> = {}) {
  log(LogLevel.INFO, msg, meta);
}

function debug(msg: string, meta: Record<string, unknown> = {}) {
  if (isDevelopment) {
    log(LogLevel.DEBUG, msg, meta);
  }
}

function logRequest(req: Request, meta: Record<string, unknown> = {}): void {
  const requestMeta: RequestMetadata = {
    method: req.method,
    path: req.path,
    ip: req.ip || undefined,
    userAgent: req.get("user-agent") || undefined,
    userId: (req as any).user?._id?.toString(),
    ...meta,
  };

  info("Incoming request", requestMeta);
}

function logResponse(
  req: Request,
  res: Response,
  responseTime: number,
  meta: Record<string, unknown> = {}
): void {
  const responseMeta: ResponseMetadata = {
    method: req.method,
    path: req.path,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    userId: (req as any).user?._id?.toString(),
    ...meta,
  };

  info("Outgoing response", responseMeta);
}

function logError(
  err: Error,
  req?: Request | null,
  meta: Record<string, unknown> = {}
): void {
  const errorContext: Record<string, unknown> = {
    ...meta,
  };

  if (req) {
    errorContext.request = {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userId: (req as any).user?._id?.toString(),
    };
  }

  error("Application error", err, errorContext);
}

export default {
  log,
  error,
  warn,
  info,
  debug,
  logRequest,
  logResponse,
  logError,
};
