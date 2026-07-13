# Coding Conventions

**Analysis Date:** 2026-07-14

## Naming Patterns

**Files:**
- kebab-case for all files (e.g., `money.ts`, `tax.ts`, `invoices.ts`)
- Collocated tests use `*.test.ts` alongside their corresponding source files
- PascalCase for React components and screens (`MoneyInput.tsx`, `PageHeader.tsx`)
- Barrel exports using `index.ts` files to expose public APIs (e.g., in `@leafx/db`, `@leafx/ui`, `@leafx/core`)

**Functions:**
- camelCase for all helper and core logic functions (e.g., `rupeesToPaise`, `computeInvoice`)
- standard hooks prefix: `useForm`, `useMutation`
- Standard event handlers use camelCase prefix: `businessId`, `formSchema`

**Variables:**
- camelCase for normal variables
- UPPER_SNAKE_CASE for constant variables (e.g., `GST_RATES`, `UNITS`, `CATEGORIES`)

**Types:**
- PascalCase for interface definitions and TypeScript types (e.g., `Item`, `Business`)
- PascalCase for Zod schema names (typically suffixed with `Schema` or `formSchema`)

## Code Style

**Formatting:**
- Indentation: 2 spaces
- Quotes: Double quotes (`"use client"`, `"product"`)
- Semicolons: Required
- Line Length: standard Prettier defaults

**Linting:**
- Configured via ESLint and Turborepo checks
- Enforces TS strictness for money-related modules

## Import Organization

**Order:**
1. Third-party dependencies (`react`, `next`, `lucide-react`, `@tanstack/react-query`)
2. Local alias workspace modules (`@leafx/types`, `@leafx/core`, `@leafx/ui`, `@leafx/db`)
3. Relative files (`../../lib/api`, `../components/page-header`)
4. Type definitions (`import type { ... }`)

**Path Aliases:**
- `@/` maps to client workspace pathing inside Next.js components

## Error Handling

**Paise Integer Rule (Critical):**
- All monetary operations must be computed in integer paise (e.g., rupees multiplied by 100) to prevent decimal floating-point rounding errors. Float math is banned for money calculations.
- Zod schemas must validate that money numbers are integer values (`z.number().int().nonnegative()`).

**Standard API Error responses:**
- Server API returns structured JSON error payloads containing descriptive error keys (e.g., `rate_limited`, error details) with matching HTTP status codes.

---
*Convention analysis: 2026-07-14*
*Update when patterns change*
