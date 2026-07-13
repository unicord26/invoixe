# Testing Patterns

**Analysis Date:** 2026-07-14

## Test Framework

**Runner:**
- Vitest 2.1.8
- Config: Configured at workspace packages level (`shared/core/package.json` contains `vitest run` script)

**Assertion Library:**
- Vitest built-in assertions
- Matchers: `toBe`, `toEqual`, `toThrow`

**Run Commands:**
```bash
npm run test                          # Run all tests in monorepo via Turborepo
npm run test --filter=@leafx/core     # Run tests only on the core tax engine package
```

## Test File Organization

**Location:**
- `*.test.ts` located collocated inside package source folders alongside files they test (e.g., [tax.test.ts](file:///h:/UniCord/Product/Vyapar/shared/core/src/tax.test.ts) collocated with [tax.ts](file:///h:/UniCord/Product/Vyapar/shared/core/src/tax.ts)).

**Naming:**
- `{filename}.test.ts` for all test suites.

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect } from "vitest";
import { rupeesToPaise } from "./money.js";

describe("domain", () => {
  it("computes something", () => {
    // arrange & act
    const val = rupeesToPaise(10);
    // assert
    expect(val).toBe(1000);
  });
});
```

**Patterns:**
- Core test targets are calculations, rounding, tax splitting (CGST/SGST/IGST), and spelling out totals in Indian words (`inWordsINR`).
- Use of golden cases (e.g., AVS PLAST golden invoice reference check) to verify the tax split behaves exactly as compliance rules dictate.

---
*Testing analysis: 2026-07-14*
*Update when test patterns change*
