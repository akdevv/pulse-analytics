import env from "@/config/env.ts";

export enum LogLevel {
  ERROR = "ERROR",
  WARN = "WARN",
  INFO = "INFO",
  DEBUG = "DEBUG",
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
    // Named fields only. Spreading an error drags in every own property,
    // which for a Prisma error is the failing query and its parameters.
    const code = (err as unknown as { code?: unknown }).code;
    errorMeta.error = {
      msg: err.message,
      stack: err.stack || "",
      name: err.name,
      ...(typeof code === "string" && { code }),
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

export default {
  log,
  error,
  warn,
  info,
  debug,
};
