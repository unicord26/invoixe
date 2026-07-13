# Architecture

**Analysis Date:** 2026-07-14

## Pattern Overview

**Overall:** Layered Monorepo Framework (Turborepo + npm workspaces)

**Key Characteristics:**
- Separation of concerns: Client frontend (`client/web`), Server backend (`server/api`), Shared libraries (`shared/core`, `shared/types`), and Database mapping (`server/db`).
- Common business logic & types package shared across client and server to prevent drift (e.g., GST calculation, Zod validations).
- Client-generated UUIDs and soft-deletes prepared for an offline-ready sync model.

## Layers

**Client UI Layer (`client/web` & `client/ui`):**
- Purpose: Frontend interface for SME billing, POS checkouts, party and inventory management.
- Contains: Next.js pages/layouts, Radix/shadcn components, GSAP animation hooks/presets, forms, and client API fetch hooks (using TanStack Query).
- Depends on: `@leafx/core`, `@leafx/types`, `@leafx/ui`, `@supabase/supabase-js`.

**Server API Layer (`server/api`):**
- Purpose: Secure JSON REST endpoints acting as the controller layer.
- Contains: Express routes, rate limiting, and session verification middleware.
- Depends on: `@leafx/db`, `@leafx/core`, `@leafx/types`, `@supabase/supabase-js`.

**Database Layer (`@leafx/db` & `server/prisma`):**
- Purpose: PostgreSQL connection management, schema modeling, and migrations.
- Contains: `schema.prisma` definitions, migration SQL scripts, and Prisma client singleton exports.
- Depends on: `@prisma/client`.

**Shared Core Layer (`shared/core` & `shared/types`):**
- Purpose: Centralized tax engine, currency integer math, transaction schemas, and TypeScript typings.
- Contains: GST calculation algorithms (`tax.ts`), paise unit converters (`money.ts`), and Zod validators (`index.ts`).
- Used by: Both `client/` and `server/` monorepo packages.

## Data Flow

**Billing Invoicing Lifecycle:**
1. **Input Generation:** Retailer types item details, quantites, and tax conditions inside the billing interface (`client/web/app/invoices/new` or similar POS view).
2. **Real-time Engine Calculation:** The UI performs real-time invoice calculations in integer paise units using the shared tax engine [tax.ts](file:///h:/UniCord/Product/Vyapar/shared/core/src/tax.ts) (auto-calculating CGST, SGST, IGST, cess, and rounding offsets).
3. **Client Submission:** On checkout, Next.js submits the validated JSON invoice payload to the server API [invoices.ts](file:///h:/UniCord/Product/Vyapar/server/api/src/routes/invoices.ts) route with the Supabase JWT session header.
4. **Auth & Session Guard:** The Express API runs the request through the [auth.ts](file:///h:/UniCord/Product/Vyapar/server/api/src/lib/auth.ts) middleware to authenticate the user and bind their `business_id` context.
5. **Payload Validation:** The API router validates the payload against Zod schemas from `@leafx/types`.
6. **DB Transaction:** The API queries Prisma client `@leafx/db` to record the Transaction, decrement stocks, adjust ledger entries, and save calculations.
7. **Response & Sync:** API returns JSON confirmation, and the client updates local states via TanStack Query.

**State Management:**
- Database: Supabase PostgreSQL tables act as the persistent source of truth.
- Client State: TanStack Query manages async remote state cache. Form states are isolated via `react-hook-form`.

## Key Abstractions

**Shared Tax Engine (`@leafx/core`):**
- Purpose: Centralized math for CGST/SGST/IGST, cess, tax-inclusive/exclusive items, discounts, and round-offs. Calculates in integer paise.
- Location: [tax.ts](file:///h:/UniCord/Product/Vyapar/shared/core/src/tax.ts).

**Prisma Client Singleton (`@leafx/db`):**
- Purpose: A database client wrapper that acts as a singleton in development to prevent connection pooling exhaustion during Next.js Hot Module Replacement (HMR).
- Location: [index.ts](file:///h:/UniCord/Product/Vyapar/server/db/src/index.ts).

**Supabase Auth Middleware (`server/api`):**
- Purpose: Session extraction and validation middleware parsing JWT tokens from Supabase, assigning verified users and active firms.
- Location: [auth.ts](file:///h:/UniCord/Product/Vyapar/server/api/src/lib/auth.ts).

## Entry Points

**API server Entry:**
- Location: [index.ts](file:///h:/UniCord/Product/Vyapar/server/api/src/index.ts)
- Triggers: Starts Express listener on port 5000 (`npm run dev:server` or `npm run dev`).
- Responsibilities: Establish DB health-checks, load auth guards, configure helmet/cors/rate-limiters, and load sub-routers.

**Web Client Entry:**
- Location: Next.js dev server on port 3000 (`npm run dev:client` or `npm run dev`).
- Triggers: Browser request landing at `http://localhost:3000`.
- Responsibilities: Client layouts, routing, session authorization, and UI assembly.

## Error Handling

**Strategy:** Express middleware catches router errors and converts them to standard JSON errors. Zod schemas validate API boundaries and return structured client field errors.
- APIs use standard try/catch blocks returning HTTP error status codes (`400 Bad Request`, `401 Unauthorized`, `500 Server Error`).
- Floating decimal errors are mitigated by using integer-paise math for money fields.

## Cross-Cutting Concerns

**Validation:**
- Performed on both client forms and API endpoints using unified Zod schemas exported from [index.ts](file:///h:/UniCord/Product/Vyapar/shared/types/src/index.ts).

**Session Authentication:**
- JWT token payload validation by Express API via Supabase Auth library.

---
*Architecture analysis: 2026-07-14*
*Update when major patterns change*
