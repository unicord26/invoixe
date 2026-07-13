# Requirements: Leafx

**Defined:** 2026-07-14
**Core Value:** To provide small and medium enterprises with a reliable, compliant, and lightning-fast GST billing and inventory control cycle.

## v1 Requirements

### Authentication & Tenant Management
- [x] **AUTH-01**: User can register and sign in with email and password (Supabase Auth).
- [x] **AUTH-02**: User sessions map securely to isolated, RLS-guarded Business IDs.
- [x] **AUTH-03**: Memberships support Owner, Admin, and Staff RBAC permissions.

### Masters Registry
- [x] **MSTR-01**: User can manage Parties (Customers/Suppliers) ledger, phone, address, and GSTIN.
- [x] **MSTR-02**: Parties can be grouped by categories for filtering and ledger tracking.
- [x] **MSTR-03**: User can register Items (Products/Services) with tax-inclusive/exclusive retail prices.

### Billing & Invoicing
- [x] **BILL-01**: System computes GST sales invoices conforming to standard golden cases.
- [x] **BILL-02**: Support customizable, gap-free invoice number prefix series.
- [x] **BILL-03**: Generate estimates, delivery challans, orders, and credit/debit notes with conversion flow.
- [x] **BILL-04**: Fast retail POS view supporting quick add-to-cart, barcodes, and single-click checkout.

### Cash & Bank
- [x] **CASH-01**: Records Payment-In and Payment-Out transactions with payment method selection.
- [x] **CASH-02**: Manage multiple bank account ledgers, deposits, withdrawals, and bank-cash transfers.

### Inventory Engine
- [x] **INVT-01**: Automatically adjust stock quantities on transactions and log manual stock corrections.
- [x] **INVT-02**: Define Bill of Materials (BOM) configurations to consume ingredients during production.

### Print & Formatting
- [x] **PRNT-01**: Render print-ready A4 invoices using GST Tally formatting themes.
- [x] **PRNT-02**: Output ESC/POS-compliant receipts for 80mm thermal receipt printers.

### Compliance & Reports
- [x] **COMP-01**: System splits taxes into CGST + SGST (intrastate) or IGST (interstate) automatically.
- [x] **COMP-02**: Compile Profit & Loss, Day Book, GSTR-1, and GSTR-3B summaries.
- [x] **COMP-03**: Export GSTR-1 return tables to compliant government JSON structures.

### Data Sync & Continuity
- [x] **SYNC-01**: Export complete business data to JSON file and restore a tenant from backup.
- [ ] **SYNC-02**: Synchronize local SQLite client operations to database server (Offline-first).

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01     | Phase A | Complete |
| AUTH-02     | Phase A | Complete |
| AUTH-03     | Phase 13 | Complete |
| MSTR-01     | Phase 1 | Complete |
| MSTR-02     | Phase 1 | Complete |
| MSTR-03     | Phase 1 | Complete |
| BILL-01     | Phase 2 | Complete |
| BILL-02     | Phase 2 | Complete |
| BILL-03     | Phase 6 | Complete |
| BILL-04     | Phase 15 | Complete |
| CASH-01     | Phase 3 | Complete |
| CASH-02     | Phase 7 | Complete |
| INVT-01     | Phase 5 | Complete |
| INVT-02     | Phase 11 | Complete |
| PRNT-01     | Phase 9 | Complete |
| PRNT-02     | Phase 9 | Complete |
| COMP-01     | Phase 2 | Complete |
| COMP-02     | Phase 8 | Complete |
| COMP-03     | Phase 10 | Complete |
| SYNC-01     | Phase 14 | Complete |
| SYNC-02     | Phase 12 | Pending |

**Coverage:**
- v1 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-14*
*Last updated: 2026-07-14 after initial onboarding*
