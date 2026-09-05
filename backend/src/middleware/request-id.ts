import { randomUUID } from "crypto";
import type { Request, Response, NextFunction } from "express";

// A caller's id is honoured so traces cross proxies, but it must match this
// pattern. It is echoed back and written into every log line for the request.
const VALID_REQUEST_ID = /^[A-Za-z0-9_-]{1,64}$/;

export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const supplied = req.headers["x-request-id"];
  req.id =
    typeof supplied === "string" && VALID_REQUEST_ID.test(supplied)
      ? supplied
      : randomUUID();
  res.setHeader("x-request-id", req.id);
  next();
};
