import { describe, expect, it, vi, beforeEach } from "vitest";
import { z } from "zod";
import type { ExecutionContext } from "@nestjs/common";
import { ZodValidationPipe } from "./zod-validation.pipe";

// The guard validates tokens against Supabase; stub that boundary.
const getUser = vi.fn();
vi.mock("../lib/supabase", () => ({
  supabaseAnon: { auth: { getUser: (t: string) => getUser(t) } },
  supabaseAdmin: { auth: { admin: {} } },
}));

const { SupabaseAuthGuard } = await import("./supabase-auth.guard");

/** Minimal ExecutionContext wrapping a fake express request. */
const ctxFor = (req: Record<string, unknown>) =>
  ({ switchToHttp: () => ({ getRequest: () => req }) }) as unknown as ExecutionContext;

describe("ZodValidationPipe", () => {
  const pipe = new ZodValidationPipe(z.object({ name: z.string().min(1), qty: z.number() }));

  it("returns the parsed value when valid", () => {
    expect(pipe.transform({ name: "Widget", qty: 2 })).toEqual({ name: "Widget", qty: 2 });
  });

  it("strips unknown keys rather than trusting client input", () => {
    expect(pipe.transform({ name: "Widget", qty: 2, businessId: "attacker-supplied" })).toEqual({
      name: "Widget",
      qty: 2,
    });
  });

  it("rejects an invalid body with the 400 contract the client expects", () => {
    try {
      pipe.transform({ name: "", qty: "two" });
      throw new Error("should have thrown");
    } catch (e: any) {
      expect(e.getStatus()).toBe(400);
      // Shape must stay { error: "validation_failed", details } — the web client reads it.
      expect(e.getResponse().error).toBe("validation_failed");
      expect(e.getResponse().details.fieldErrors).toBeDefined();
    }
  });
});

describe("SupabaseAuthGuard", () => {
  const guard = new SupabaseAuthGuard();
  beforeEach(() => getUser.mockReset());

  it("rejects a request with no Authorization header", async () => {
    await expect(guard.canActivate(ctxFor({ headers: {} }))).rejects.toMatchObject({
      response: { error: "unauthenticated" },
    });
  });

  it("rejects a non-Bearer Authorization header", async () => {
    await expect(
      guard.canActivate(ctxFor({ headers: { authorization: "Basic abc123" } }))
    ).rejects.toMatchObject({ response: { error: "unauthenticated" } });
  });

  it("rejects a token Supabase does not recognise", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { message: "bad jwt" } });
    await expect(
      guard.canActivate(ctxFor({ headers: { authorization: "Bearer nonsense" } }))
    ).rejects.toMatchObject({ response: { error: "invalid_token" } });
  });

  it("accepts a valid token and attaches the user", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1", email: "a@b.com" } }, error: null });
    const req: any = { headers: { authorization: "Bearer good" } };
    await expect(guard.canActivate(ctxFor(req))).resolves.toBe(true);
    expect(req.authUser).toEqual({ id: "u1", email: "a@b.com", requestedBusinessId: undefined });
  });

  it("passes the bearer token through, not the whole header", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1", email: null } }, error: null });
    await guard.canActivate(ctxFor({ headers: { authorization: "Bearer tok-123" } }));
    expect(getUser).toHaveBeenCalledWith("tok-123");
  });

  it("carries x-business-id through as a *request*, never as authority", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1", email: null } }, error: null });
    const req: any = { headers: { authorization: "Bearer good", "x-business-id": "biz-9" } };
    await guard.canActivate(ctxFor(req));
    // Recorded as requestedBusinessId — getUserBusinessId still has to verify
    // membership before it is honoured.
    expect(req.authUser.requestedBusinessId).toBe("biz-9");
  });
});
