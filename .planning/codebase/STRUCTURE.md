# Codebase Structure

**Analysis Date:** 2026-07-14

## Directory Layout

```
leafx/
├── client/                 # Frontend styling, components, and applications
│   ├── ui/                 # Shared UI package (GSAP, CSS styles, tokens)
│   └── web/                # Next.js 15 Web Application (billing app UI, routes)
├── server/                 # Backend JSON server, schemas, and queries
│   ├── api/                # Express API Backend server
│   ├── db/                 # Prisma database connection singleton package
│   └── prisma/             # Prisma DB models schema and SQL migrations
├── shared/                 # Shared libraries used by client and server
│   ├── core/               # Core business utilities (GST calculation, Vitest tests)
│   └── types/              # Domain schemas (Zod validators and TS types)
├── package.json            # Monorepo workspaces definition
├── turbo.json              # Turborepo task pipeline configs
└── PLAN.md                 # Workspace project blueprint (Vyapar parity roadmap)
```

## Directory Purposes

**client/web/**
- Purpose: Main customer-facing Next.js dashboard, POS checkout, ledger pages, and store management web application.
- Contains: `app/` folder (Next.js app router pages, components, client-side fetching).
- Key files: [page.tsx](file:///h:/UniCord/Product/Vyapar/client/web/app/items/new/page.tsx) (Items creator page), `package.json`.

**client/ui/**
- Purpose: Shared theme styling tokens and GSAP transitions.
- Contains: GSAP animation scripts, stylesheet theme classes.
- Key files: `package.json`, `src/theme.css`.

**server/api/**
- Purpose: Express backend server that serves endpoints to the client.
- Contains: API routes, authentication guards, input validation.
- Key files: [index.ts](file:///h:/UniCord/Product/Vyapar/server/api/src/index.ts) (API Server entry point), `src/routes/` (sub-routers).

**server/db/**
- Purpose: Shared Prisma Postgres connection singleton database access wrapper.
- Key files: [index.ts](file:///h:/UniCord/Product/Vyapar/server/db/src/index.ts).

**server/prisma/**
- Purpose: Database schemas and SQL dev migrations.
- Key files: [schema.prisma](file:///h:/UniCord/Product/Vyapar/server/prisma/schema.prisma) (database structures).

**shared/core/**
- Purpose: Strict tax and minor unit money computations logic.
- Key files: [tax.ts](file:///h:/UniCord/Product/Vyapar/shared/core/src/tax.ts) (GST core logic), `src/tax.test.ts` (Vitest test files).

**shared/types/**
- Purpose: Shared model type declarations and Zod validators.
- Key files: [index.ts](file:///h:/UniCord/Product/Vyapar/shared/types/src/index.ts) (Zod shapes and types).

## Key File Locations

**Entry Points:**
- [index.ts](file:///h:/UniCord/Product/Vyapar/server/api/src/index.ts): Express API listening entry point.
- [package.json](file:///h:/UniCord/Product/Vyapar/client/web/package.json): Next.js web application page startup.

**Configuration:**
- [package.json](file:///h:/UniCord/Product/Vyapar/package.json): Root monorepo package workspace links.
- [turbo.json](file:///h:/UniCord/Product/Vyapar/turbo.json): Caching and pipeline builds.
- [schema.prisma](file:///h:/UniCord/Product/Vyapar/server/prisma/schema.prisma): Database migrations and ORM schema mapping.

**Core Logic:**
- [tax.ts](file:///h:/UniCord/Product/Vyapar/shared/core/src/tax.ts): GST calculation operations.
- [index.ts](file:///h:/UniCord/Product/Vyapar/shared/types/src/index.ts): Zod payload validators.

**Testing:**
- [tax.test.ts](file:///h:/UniCord/Product/Vyapar/shared/core/src/tax.test.ts): Vitest calculation unit tests.

## Naming Conventions

**Files:**
- `*.tsx`: React client components and page structures.
- `*.ts`: Standard TypeScript files (modules, routers, helpers, tests).
- `*.test.ts`: Vitest test suites.

**Directories:**
- kebab-case: Directories representing routes, packages, or specific features.
- Plural nouns for routers (`routes/`, `items/`, `parties/`).

## Where to Add New Code

**New Feature (Client & Server):**
1. Add new database tables in [schema.prisma](file:///h:/UniCord/Product/Vyapar/server/prisma/schema.prisma), then run `npm run db:push` or `npm run db:generate`.
2. Model validation types in [index.ts](file:///h:/UniCord/Product/Vyapar/shared/types/src/index.ts).
3. Create server endpoint routes in `server/api/src/routes/` and hook them in [index.ts](file:///h:/UniCord/Product/Vyapar/server/api/src/index.ts).
4. Create React pages under `client/web/app/` making calls to the server.

**Core Calculations:**
- Functions belong in [shared/core/src/](file:///h:/UniCord/Product/Vyapar/shared/core/src/) and corresponding tests in `tax.test.ts`.

---
*Structure analysis: 2026-07-14*
*Update when directory structure changes*
