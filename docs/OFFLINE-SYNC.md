# Phase 12 — Offline-first sync (design & migration plan)

> **Status: not implemented in this build.** Unlike every other phase, true offline-first
> sync needs infrastructure that can't be provisioned from code alone (a sync service +
> on-device SQLite + conflict resolution). This document is the honest, ready-to-execute
> plan. The data model was deliberately built sync-ready from Phase 0, so this is additive —
> no rewrite of existing code.

## Why it was deferred (and why that's fine)

The app is **online-first** today: the web client and mobile app call the Express API, which
talks to Supabase Postgres. That is correct and shippable. Offline is an *enhancement* for
shopkeepers with flaky connectivity — Vyapar's signature capability — but it is the single
hardest part of the whole product, so it comes last.

## What's already in place (groundwork done)

- **Client-generated UUID primary keys** on every table — no server round-trip needed to mint IDs offline.
- **`updatedAt` + soft-delete (`deletedAt`)** on every table — the two columns a sync engine needs to compute deltas and tombstones.
- **Integer-paise money + a pure tax engine in `shared/core`** — the same calculation code runs on-device, so an offline invoice computes identical totals to the server.
- **Business-scoped rows** everywhere — sync can be partitioned per `businessId`.

## Recommended approach: PowerSync (Postgres ↔ SQLite)

1. **On-device store**: `@journeyapps/react-native-quick-sqlite` (mobile) / `wa-sqlite` (web) holding a mirror of the business's rows.
2. **Sync service**: **PowerSync** connects to Supabase Postgres via logical replication and streams changes down; local writes queue and upload when back online.
3. **Sync rules** (`powersync.yaml`): bucket by `business_id` so each device only pulls its firm(s).
4. **Auth**: reuse the Supabase JWT — PowerSync validates the same token the API already trusts.

### Alternative
- **RxDB + Supabase replication** if we want a document-style local DB.
- **WatermelonDB** if we lean fully into React Native.

## Conflict resolution policy (decide before building)

- **Masters (parties, items, business):** last-write-wins on `updatedAt` — safe, rarely conflicting.
- **Transactions (invoices, payments, …):** **immutable + append-only**. An invoice is never edited
  concurrently; corrections happen via credit/debit notes (already built in Phase 6). This sidesteps
  the hardest conflicts entirely.
- **Invoice numbering:** the gap-free counter (`NumberSeries`) must stay **server-authoritative**.
  Offline devices mint a temporary local number and the server assigns the final sequence on upload.
  (This is the one place that needs care.)
- **Stock:** movements are append-only signed deltas (already the design) — they merge additively
  with no conflict.

## Execution checklist (when ready)

- [ ] Stand up a PowerSync instance pointed at the Supabase project.
- [ ] Write `powersync.yaml` sync rules bucketed by `business_id`.
- [ ] Add the on-device SQLite schema (generated from Prisma) to `client/mobile` and `client/web`.
- [ ] Route reads through the local DB; queue writes locally.
- [ ] Server-side: an upload handler that (a) assigns final invoice numbers, (b) rejects stale master
      writes by `updatedAt`.
- [ ] Test the offline→online transition and the numbering hand-off explicitly.

## Estimate

~1–2 focused weeks, dominated by the numbering hand-off and end-to-end offline testing — not by
the CRUD, which the sync engine handles generically.
