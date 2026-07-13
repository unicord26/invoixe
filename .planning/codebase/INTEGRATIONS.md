# External Integrations

**Analysis Date:** 2026-07-14

## APIs & External Services

**Auth & Session Provisioning:**
- Supabase Auth - Handles user authentication (email/password, token validation)
  - SDK/Client: `@supabase/supabase-js` v2.47.10 (client)
  - Verification: Server-side token validation is performed in [auth.ts](file:///h:/UniCord/Product/Vyapar/server/api/src/lib/auth.ts) using JWT verification.
  - Auth parameters: `SUPABASE_JWT_SECRET` (server) and `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_URL` (client).

## Data Storage

**Databases:**
- PostgreSQL on Supabase - Primary database store
  - Connection: via `DATABASE_URL` (pooler session mode, port 5432) and `DIRECT_URL` (pooler session mode, port 5432).
  - Client: `@leafx/db` using Prisma ORM client v6.1.0.
  - Migrations: Managed using `prisma db push` / `prisma migrate` directed at the schema in [schema.prisma](file:///h:/UniCord/Product/Vyapar/server/prisma/schema.prisma).

**File Storage:**
- Supabase Storage - Logo and signature image storage
  - SDK/Client: `@supabase/supabase-js` v2.47.10
  - Fields stored: `logoUrl` and `signatureUrl` in the `Business` table schema.

## CI/CD & Deployment

**Hosting:**
- Client: Next.js server running locally on port 3000 in development.
- Server: Node.js Express server running locally on port 5000 in development.
- Database: Managed PostgreSQL database hosted on Supabase (region `ap-northeast-1`).

**CI Pipeline:**
- GitHub Actions - Configured for typecheck and testing check tasks (referenced in PLAN.md).

## Environment Configuration

**Development:**
- Required env vars:
  - `DATABASE_URL` and `DIRECT_URL` (Prisma Postgres credentials)
  - `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL` (Supabase project URL)
  - `SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase anonymous public key)
  - `SUPABASE_SERVICE_ROLE_KEY` (Supabase admin/service role key - server only)
  - `SUPABASE_JWT_SECRET` (Supabase JWT token verification key - server only)
  - `API_PORT` (port for Express API, defaults to 5000)
  - `NEXT_PUBLIC_API_URL` (address of Express API, defaults to http://localhost:5000)
- Secrets location: `.env` file in the monorepo root directory (gitignored).

---
*Integration audit: 2026-07-14*
*Update when adding/removing external services*
