// server/auth.ts
import type { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Shared helper to ensure there's a user in the session (for dev).
 */
function ensureDevSession(req: Request) {
  const sess: any = req.session;
  if (sess && sess.userId) return;

  const devUser = {
    id: "dev-user",
    firstName: "Dev",
    lastName: "Admin",
    email: "dev@example.dev",
    role: "admin" as const,
  };

  (req.session as any).userId = devUser.id;
  (req.session as any).user = devUser;

  console.log(
    "[auth] dev auto-session attached",
    { userId: devUser.id, path: req.path, method: req.method }
  );
}

/**
 * Auth guard used on all private /api routes.
 *
 * - In PRODUCTION: strict → 401 if there is no userId on the session.
 * - In DEV (NODE_ENV !== 'production'):
 *     If there is no session user, we auto-attach a dev user so you don't get
 *     stuck behind flaky cookie / CORS issues on localhost.
 */
export const isAuthenticated: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const sess: any = req.session;

  // If we already have a logged-in user, just continue.
  if (sess && sess.userId) {
    return next();
  }

  // In dev, auto-create a session so protected routes work.
  if (process.env.NODE_ENV !== "production") {
    ensureDevSession(req);
    return next();
  }

  // In production, be strict.
  return res.status(401).json({ message: "Unauthorized" });
};
