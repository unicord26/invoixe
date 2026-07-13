# Roadmap: Leafx

## Milestones

- ✅ **v1.0 Core Vyapar parity** - Initial suite replication (Phases 0-11, A, 13-16) - Shipped 2026-07-13
- 🚧 **v1.1 Offline Synchronization** - Client-side synchronization (Phase 12) - In Progress

## Phases

<details>
<summary>✅ v1.0 Core Vyapar parity (Phases 0-11, A, 13-16) - SHIPPED 2026-07-13</summary>

### Phase 0: Foundations
**Goal**: Monorepo scaffolding, Supabase database connections, Leafx layout styles, and Jest/Vitest tax engine configuration.
**Status**: Complete

### Phase 1: Masters
**Goal**: Parties & Items CRUD schemas with categorization groupings.
**Status**: Complete

### Phase A: Auth & Security
**Goal**: Supabase email auth, token JWT validators, and Tenant RLS policies.
**Status**: Complete

### Phase 2: Billing Loop
**Goal**: Invoice builder, sequence numbering, and tax split calculator.
**Status**: Complete

### Phase 3: Money in/out
**Goal**: Payments ledgers with running balances.
**Status**: Complete

### Phase 4: Purchases & Expenses
**Goal**: Purchase bills and expense categories tracking.
**Status**: Complete

### Phase 5: Inventory
**Goal**: Transaction stock updates, adjustments, and low-stock warnings.
**Status**: Complete

### Phase 6: All Documents
**Goal**: Challans, estimates, and purchase/sales orders.
**Status**: Complete

### Phase 7: Cash & Bank
**Goal**: Account deposits, withdrawals, and ledger transfers.
**Status**: Complete

### Phase 8: Reports Engine
**Goal**: GSTR reporting tables, P&L, and Day Book summaries.
**Status**: Complete

### Phase 9: Print & Branding
**Goal**: A4 GST-Tally template layout and 80mm thermal receipts.
**Status**: Complete

### Phase 10: GST Compliance
**Goal**: Standardized government GSTR-1 JSON formats exporting.
**Status**: Complete

### Phase 11: Manufacturing & Godowns
**Goal**: Bill of Materials (BOM) configurations and production consumption.
**Status**: Complete

### Phase 13: Multi-Firm & Roles
**Goal**: Switch businesses in context, and membership role privileges.
**Status**: Complete

### Phase 14: Backup & Import
**Goal**: Tenant-level backup JSON files exporting and importing.
**Status**: Complete

### Phase 15: POS & Retail
**Goal**: Rapid cart billing panel, barcodes support.
**Status**: Complete

### Phase 16: Online Store & Growth
**Goal**: Public shareable catalog links and WhatsApp notifications.
**Status**: Complete

</details>

### 🚧 v1.1 Offline Synchronization (In Progress)

#### Phase 12: Offline-First Sync
**Goal**: Implement client-side SQLite replication and synchronization mechanics to allow business management while offline.
**Depends on**: Phase 11
**Requirements**: SYNC-02
**Success Criteria** (what must be TRUE):
  1. User can create, edit, or view transactions, items, and parties while offline.
  2. Local edits persist in SQLite cache and sync automatically to Supabase when network is restored.
  3. Conflicts resolve gracefully based on timestamp rules.
**Plans**: TBD

Plans:
- [ ] 12-01: SQLite architecture and local schema setup
- [ ] 12-02: Sync manager engine and transaction caching logic
- [ ] 12-03: Conflict resolution testing and verification

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 0     | v1.0      | 1/1            | Complete | 2026-07-13 |
| 1     | v1.0      | 1/1            | Complete | 2026-07-13 |
| A     | v1.0      | 1/1            | Complete | 2026-07-13 |
| 2     | v1.0      | 1/1            | Complete | 2026-07-13 |
| 3     | v1.0      | 1/1            | Complete | 2026-07-13 |
| 4     | v1.0      | 1/1            | Complete | 2026-07-13 |
| 5     | v1.0      | 1/1            | Complete | 2026-07-13 |
| 6     | v1.0      | 1/1            | Complete | 2026-07-13 |
| 7     | v1.0      | 1/1            | Complete | 2026-07-13 |
| 8     | v1.0      | 1/1            | Complete | 2026-07-13 |
| 9     | v1.0      | 1/1            | Complete | 2026-07-13 |
| 10    | v1.0      | 1/1            | Complete | 2026-07-13 |
| 11    | v1.0      | 1/1            | Complete | 2026-07-13 |
| 12    | v1.1      | 0/3            | Not started | - |
| 13    | v1.0      | 1/1            | Complete | 2026-07-13 |
| 14    | v1.0      | 1/1            | Complete | 2026-07-13 |
| 15    | v1.0      | 1/1            | Complete | 2026-07-13 |
| 16    | v1.0      | 1/1            | Complete | 2026-07-13 |

---
*Roadmap defined: 2026-07-14*
*Last updated: 2026-07-14 after GSD Onboarding*
