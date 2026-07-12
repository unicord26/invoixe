import type { Request, Response, NextFunction } from "express";
import { supabaseAnon } from "./supabase";

export interface AuthUser {
  id: string;
  email: string | null;
  /** Optional firm the client asked to act on (x-business-id header). */
  requestedBusinessId?: string;
}

// Attach the authenticated user to the Express request.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

/**
 * Require a valid Supabase access token. We validate the token against Supabase
 * Auth (auth.getUser) rather than verifying the JWT locally, so it works with
 * both symmetric and asymmetric signing keys.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "unauthenticated" });

  const { data, error } = await supabaseAnon.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: "invalid_token" });

  const requested = req.headers["x-business-id"];
  req.authUser = {
    id: data.user.id,
    email: data.user.email ?? null,
    requestedBusinessId: typeof requested === "string" ? requested : undefined,
  };
  next();
}
