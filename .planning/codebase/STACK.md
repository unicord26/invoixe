# Technology Stack

**Analysis Date:** 2026-07-14

## Languages

**Primary:**
- TypeScript 5.7.2 - Used across all monorepo packages (web, api, core, types, db, config)

**Secondary:**
- JavaScript - Build scripts, configs (`postcss.config.js`, `tailwind.config.js`, etc.)

## Runtime

**Environment:**
- Node.js >=20 (Configured in engines block)
- Web Browser runtime (for Next.js client)

**Package Manager:**
- npm 11.6.1 (with npm workspaces configured)
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js 15.1.3 - Web client (billing app, dashboards, item management)
- Express 4.21.2 - API server (JSON REST endpoints)
- Prisma Client 6.1.0 - Schema-based database client and migrations management

**Testing:**
- Vitest 2.1.8 - Unit tests for tax and money calculation engine in `@leafx/core`

**Build/Dev:**
- Turborepo 2.3.3 - Workspace task runner
- tsx 4.19.2 - CLI for executing TypeScript watch files in backend dev mode
- Tailwind CSS 3.4.17 - Utility-first styling framework
- PostCSS & Autoprefixer - CSS compilation and formatting

## Key Dependencies

**Critical:**
- `supabase-js` 2.47.10 - Connection client for Supabase authentication, storage, and database access
- `zod` 3.25.76 - Unified validation schema for API payloads, forms, and TypeScript types
- `gsap` 3.15.0 & `@gsap/react` 2.1.2 - Animation engine for UI transitions, counters, and charts
- `react-hook-form` 7.81.0 - Client form management and state synchronization
- `radix-ui` (various packages) - Accessible component primitives for shadcn/ui library

**Infrastructure:**
- `cors` 2.8.5 - Express CORS middleware
- `helmet` 8.3.0 - Security headers middleware for Express
- `express-rate-limit` 8.5.2 - Rate-limiting rules for API endpoint security

## Configuration

**Environment:**
- `.env` files (loaded by `dotenv` in API, automatically by Next.js in client)
- Key configs: `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`

**Build:**
- `tsconfig.json` - TypeScript compiler parameters at workspace roots and root directory
- `turbo.json` - Turborepo build pipeline caching rules
- `tailwind.config.js` - CSS utilities configuration

## Platform Requirements

**Development:**
- Cross-platform (Windows / macOS / Linux with Node.js and npm)
- Connected to Supabase cloud instance (`ap-northeast-1` region)

**Production:**
- Vercel or equivalent static/serverless host for the web client
- Node.js server container for the Express API
- Supabase managed Postgres instance

---
*Stack analysis: 2026-07-14*
*Update after major dependency changes*
