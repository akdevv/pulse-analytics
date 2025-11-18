import type { IUser } from "@/modules/auth/auth.types";

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export {};

