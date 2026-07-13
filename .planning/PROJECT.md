# Leafx

## What This Is
Leafx is a premium, multi-tenant GST Billing, POS, Accounting, and Inventory platform built as a functionally-complete alternative to Vyapar for Indian SMEs. It features a modern green-themed design, real-time compliant tax calculations, and a responsive web and mobile experience.

## Core Value
To provide small and medium enterprises with a reliable, compliant, and lightning-fast GST billing and inventory control cycle.

## Requirements

### Validated
- ✓ Monorepo Foundations & CI typecheck/test pipeline (Phase 0)
- ✓ Masters: Parties & Items CRUD with party groups and item categories (Phase 1)
- ✓ Auth & Security: Supabase JWT login with Tenant RLS isolation (Phase A)
- ✓ Billing Loop: Sale invoice builder with compliant numbering and GST calculations (Phase 2)
- ✓ Money In/Out: Payments, allocations, and party ledger with running balances (Phase 3)
- ✓ Purchases & Expenses: Purchase bills and expense tracking (Phase 4)
- ✓ Inventory Engine: Live stock tracking, adjustments, and low-stock indicators (Phase 5)
- ✓ All Documents: Estimates, orders, challans, credit/debit notes, and conversions (Phase 6)
- ✓ Cash & Bank: Bank accounts deposits, withdrawals, and transfers (Phase 7)
- ✓ Reports: P&L, GSTR-1/3B, stock valuation, and day book (Phase 8)
- ✓ Print & Branding: A4 GST-Tally layout and 80mm thermal receipt layouts (Phase 9)
- ✓ GST Compliance: GSTR-1 JSON export (Phase 10)
- ✓ Manufacturing: Bill of Materials (BOM) and production consumption (Phase 11)
- ✓ Multi-firm & Roles: Multi-tenant business switcher and RBAC settings (Phase 13)
- ✓ Backup & Import: Complete JSON backup export and import tool (Phase 14)
- ✓ POS Mode: Quick cart retail POS counter checkout (Phase 15)
- ✓ Online Store: Public product catalog and shareable checkout link (Phase 16)

### Active
- [ ] **Offline-First Synchronizer:** Introduce local SQLite syncing via PowerSync or equivalent (Phase 12).
- [ ] **Bulk Import utilities:** Support bulk Excel/CSV import for items and parties (Phase 1 follow-up).
- [ ] **Invoice-Level allocation:** Map payments directly to specific invoice numbers (Phase 3 follow-up).
- [ ] **Item Batches and Serials:** Trace items by unique batch numbers, expiry dates, and serial numbers (Phase 5 follow-up).
- [ ] **Recurring Transactions:** Setup recurring invoice generators (Phase 6 follow-up).

### Out of Scope
- Replicating Vyapar's exact brand assets, UI layouts, or source code (Leafx is built as a custom product using original assets).
- Offline-first operations for early phases (online-only database synchronization until Phase 12).

## Context
Leafx addresses Indian compliance rules (slabs 0/5/12/18/28%, CGST, SGST, IGST, cess, TCS/TDS). All monetary fields are represented in integer paise to eliminate javascript floating decimal inaccuracies. 

## Constraints
- **Tech Stack**: Next.js 15, Express backend, Prisma ORM, and Supabase Auth/DB are locked.
- **Database Connection**: Database connections must route via session poolers (`port 5432`) due to local network IPv6 access constraints.
- **Brand Theme**: Colors must adhere to the Leafx green/red theme.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Integer Paise Math | Floating-point decimal errors cause discrepancies in GST compliance calculations. | ✓ Good |
| Online-only for v1 | Sync is complex; defer sync mechanics until core billing, inventory, and reporting features are validated. | ✓ Good |
| Monorepo Architecture | Shared types and core tax calculators prevent logical drift between web and mobile applications. | ✓ Good |

---

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-14 after GSD Onboarding*
