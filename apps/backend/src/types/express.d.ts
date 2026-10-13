import type { PublicUser } from "@tiendadcc/utils";

declare global {
  namespace Express {
    interface Request {
      user?: PublicUser;
    }
  }
}

export {};
