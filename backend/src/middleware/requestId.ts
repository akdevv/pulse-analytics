import { v4 as uuidv4 } from "uuid";
import type { Request, Response, NextFunction } from "express";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const clientId = req.headers["x-request-id"] as string | undefined;

  const requestId = clientId && isValidUUID(clientId) ? clientId : uuidv4();
  req.id = requestId;

  res.setHeader("X-Request-ID", requestId);
  next();
}

function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
