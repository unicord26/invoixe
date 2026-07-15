import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, createParamDecorator } from "@nestjs/common";
import type { Request } from "express";
import { supabaseAnon } from "../lib/supabase";
import type { AuthUser } from "../lib/auth";

/**
 * Nest port of the `requireAuth` middleware.
 *
 * Validates the token against Supabase Auth (auth.getUser) rather than verifying
 * the JWT locally, so it works with both symmetric and asymmetric signing keys.
 * Error bodies match the Express version exactly — the client checks these.
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) throw new UnauthorizedException({ error: "unauthenticated" });

    const { data, error } = await supabaseAnon.auth.getUser(token);
    if (error || !data.user) throw new UnauthorizedException({ error: "invalid_token" });

    const requested = req.headers["x-business-id"];
    req.authUser = {
      id: data.user.id,
      email: data.user.email ?? null,
      requestedBusinessId: typeof requested === "string" ? requested : undefined,
    };
    return true;
  }
}

/** Injects the authenticated user — the guard guarantees it is set. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser =>
    context.switchToHttp().getRequest<Request>().authUser!
);
