# Codebase Concerns

**Analysis Date:** 2026-07-14

## Tech Debt

**Local Session Pooler connection for DB Push/Migrations:**
- Issue: Both `DATABASE_URL` and `DIRECT_URL` are configured to use the IPv4 **session-mode pooler** (`aws-1-ap-northeast-1.pooler.supabase.com:5432`).
- Files: `.env` (gitignored), [schema.prisma](file:///h:/UniCord/Product/Vyapar/server/prisma/schema.prisma)
- Why: The direct host `db.<ref>.supabase.co` is IPv6-only and unreachable on the current network.
- Impact: Session pooler supports DDL, but running database migrations under high traffic or concurrency on session poolers can lock database transactions or exhaust pool size limits.
- Fix approach: Transition to a proper dual-stack proxy or tunnel when moving to staging/production to allow separating transaction pooling from direct migration execution.

**Hardcoded fallback business scoping:**
- Issue: Fallback business ID is hardcoded to string `"shared"` when local storage lacks a value.
- File: [page.tsx](file:///h:/UniCord/Product/Vyapar/client/web/app/items/new/page.tsx#L40-L41)
- Why: Fallback to permit anonymous testing during early development stage.
- Impact: Risks writing transaction records to a shared default business, polluting multi-tenant scoping.
- Fix approach: Replace default `"shared"` fallback with a strict redirect to the user's business provisioning screen or auth flow.

## Security Considerations

**Database Row Level Security (RLS) policies verification:**
- Risk: Supabase has RLS enabled but client queries via REST APIs must correctly scope actions per-user and per-business.
- Current mitigation: Express server applies token auth validation in [auth.ts](file:///h:/UniCord/Product/Vyapar/server/api/src/lib/auth.ts) and filters query logic using user membership.
- Recommendations: Implement Postgres-level policies (`auth.uid()` checks) if the web client ever connects directly to Supabase rather than routing through the Express backend proxy.

## Fragile Areas

**Offline Schema sync-readiness:**
- Why fragile: Tables use client-gen UUIDs and soft deletes (`deleted_at` fields) in anticipation of Phase 12 offline sync, but the sync mechanism itself is not yet implemented.
- Common failures: Clients updating records offline might experience conflicts when synchronizing if custom merge logic is missing.
- Safe modification: Check [schema.prisma](file:///h:/UniCord/Product/Vyapar/server/prisma/schema.prisma) model definitions to ensure all new tables carry `id String @id @default(uuid())` and `deletedAt DateTime?` stamps.

## Test Coverage Gaps

**API Routes and Client integration:**
- What's not tested: Express API endpoints (`/api/invoices`, `/api/parties`, etc.) and Next.js form submissions have no automated integration tests.
- Risk: Changes to database schemas or API validators could break the client app without warning.
- Priority: Medium
- Difficulty to test: Requires setting up a mock Supabase authentication server or test client wrapper in the testing pipeline.
- Coverage: Focus is currently solely on Vitest unit tests in `@leafx/core`.

---
*Concerns audit: 2026-07-14*
*Update as issues are fixed or new ones discovered*
