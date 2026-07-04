# Implementation Plan — 4.6 IRD Reports (API + UI)

**Status:** ✅ COMPLETE (MVP)
**Mode:** Strict Planning (antigravity Mode C)
**Depth:** Functional MVP (working end-to-end, minimal tests, TODO markers for polish)
**Scope:** Backend IRD report endpoints + tenant-admin UI; reuse existing reports.service.ts patterns
**Key finding:** All required Prisma models already exist (`MasterBill`, `Invoice`, `Bill`, `CbmsSyncQueue`, `FinanceAuditLog`, `ReprintLog`, `PaymentReceived`, `PaymentMade`, `Supplier`, `Customer`). **No schema changes, no migrations**.

## Delivered (verification)
- Backend: 12 new methods in `apps/api/src/modules/finance/reports.service.ts`
- Backend: 12 new endpoints in `apps/api/src/modules/finance/reports.controller.ts`
- Frontend lib: `apps/tenant-admin/lib/api.ts` (`tenantFinanceReportsApi`) + `apps/tenant-admin/lib/report-utils.tsx` (shared helpers)
- Frontend pages: 1 landing + 11 IRD pages + 5 NFRS pages under `apps/tenant-admin/app/(admin)/reports/`
- Sidebar entry added to `apps/tenant-admin/app/(admin)/layout.tsx`
- Typecheck: backend `reports.*.ts` clean, all 16 frontend pages clean (only pre-existing monorepo errors remain)
- Architecture note: `system_architecture_4_6_ird_reports.md`

---

## Files to touch

### `[MODIFY] apps/api/src/modules/finance/reports.service.ts`
Add 10 new methods to the existing `ReportsService` class. Reuse the existing `getAccountBalances()` helper and the `Decimal` arithmetic pattern already in the file. Methods:

1. `getSalesBook(tenantId, startDate, endDate)` — IRD Schedule 6D. Query `MasterBill` where `billDate BETWEEN start AND end`, `isBillActive = true`, joined to `Invoice` (via `invoiceId`) and `Invoice.customer`. Returns rows: `{ billDate, billNo, customerName, customerPan, amount, discount, taxableAmount, taxAmount, totalAmount, isRealtime, paymentMethod }`. Plus totals: `totalAmount, totalTaxable, totalVat`.
2. `getPurchaseBook(tenantId, startDate, endDate)` — Query `Bill` where `billDate BETWEEN ...`, `isActive = true`, joined to `supplier`. Returns rows + totals (subtotal, vatAmount, totalAmount).
3. `getVatReturn(tenantId, startDate, endDate)` — Output VAT = sum(invoices.vatAmount where isActive); Input VAT = sum(bills.vatAmount where isActive); Net VAT Payable = Output - Input. Plus count of invoices/bills. Returns `{ outputVat, inputVat, netVatPayable, invoiceCount, billCount, period }`.
4. `getTdsSummary(tenantId, startDate, endDate)` — Group `PaymentMade` (where tdsAmount > 0) by `payeeType` + `payeeId`. Returns `{ payeeName, payeeType, totalGross, totalTds, count }` + grand total.
5. `getDeferredRevenueSchedule(tenantId, asOfDate)` — Query `JournalEntryLine` where `account.accountCode = '2132'` (Deferred Membership Revenue per FINANCE_MODULE.md §5.1). Sum by account. Returns `{ account, openingBalance, additions, recognized, closingBalance }`. MVP: just list accounts with non-zero deferred-revenue balance + member/plan info (placeholder TODO for member detail since `Membership` model not joined — link via invoice `notes`).
6. `getArAging(tenantId, asOfDate)` — Reuse existing `getAccountsReceivable()` logic but as of a date and with buckets: 0-30, 31-60, 61-90, 90+. Returns buckets + invoice rows + grand total.
7. `getApAging(tenantId, asOfDate)` — Mirror of AR aging but on `Bill` (sum `totalAmount - paidAmount` where not paid & active, joined to `supplier`).
8. `getCancelledBills(tenantId, startDate, endDate)` — Query `Invoice` where `isActive = false`, `cancelledAt BETWEEN ...`. Returns rows with `invoiceNumber, customerName, cancelReason, cancelledAt, cancelledBy, totalAmount`.
9. `getReprintLog(tenantId, startDate, endDate)` — Query `ReprintLog` where `printedAt BETWEEN ...`, joined to `Invoice`. Returns rows with `billNo, invoiceNumber, printType, copyNumber, printedBy, printedAt, reason, ipAddress`.
10. `getAuditTrail(tenantId, startDate, endDate, filters?)` — Query `FinanceAuditLog` where `actionAt BETWEEN ...`, optionally filtered by `tableName`, `action`, `actionBy`. Returns rows + total count.
11. `getCbmsSyncStatus(tenantId)` — Query `MasterBill` counts by `syncWithIrd` (synced vs pending); `CbmsSyncQueue` rows where `status IN ('PENDING','FAILED')` ordered by `createdAt desc`. Returns `{ syncedCount, pendingCount, failedQueue, oldestPendingAge }`.
12. `getAllReportsSummary(tenantId)` — Quick aggregator: counts for each report type for the reports landing page.

### `[MODIFY] apps/api/src/modules/finance/reports.controller.ts`
Add 11 new `@Get()` endpoints to the existing `ReportsController`. All reuse `@UseGuards(JwtAuthGuard)` (already on the class) and `@Req() req.user.tenantId`. Endpoints (paths per FINANCE_MODULE.md §16.4):
- `GET /finance/reports/sales-book?startDate=&endDate=`
- `GET /finance/reports/purchase-book?startDate=&endDate=`
- `GET /finance/reports/vat-return?startDate=&endDate=`
- `GET /finance/reports/tds-summary?startDate=&endDate=`
- `GET /finance/reports/deferred-revenue?asOfDate=`
- `GET /finance/reports/ar-aging?asOfDate=`
- `GET /finance/reports/ap-aging?asOfDate=`
- `GET /finance/reports/cancelled-bills?startDate=&endDate=`
- `GET /finance/reports/reprint-log?startDate=&endDate=`
- `GET /finance/reports/audit-trail?startDate=&endDate=&tableName=&action=&actionBy=`
- `GET /finance/reports/cbms-sync-status`
- `GET /finance/reports/summary` (counts for landing page)

### `[MODIFY] apps/tenant-admin/lib/api.ts`
Add a new `tenantFinanceReportsApi` export with one method per endpoint. All take `subdomain` + date params and return `ApiResponse<T>`. Follow the existing `tenantFinanceApi` pattern.

### `[NEW] apps/tenant-admin/app/(admin)/reports/page.tsx`
**Landing page** for all financial reports. Two groups: "NFRS Financial Statements" (links to existing/built pages — balance sheet, income statement, trial balance, cash flow, AR) and "IRD Compliance Reports" (links to the 11 new pages). Each card shows count from `summary` endpoint. Period picker (start date + end date) global, passed via query string to sub-pages.

### `[NEW] apps/tenant-admin/app/(admin)/reports/layout.tsx`
Shared layout for `/reports/*` routes — renders a sub-nav of report categories + period picker. Honors the existing `(admin)/layout.tsx` outer chrome.

### `[NEW] apps/tenant-admin/app/(admin)/reports/{reportName}/page.tsx`
One page per IRD report (11 pages). Each:
- `'use client'` component (per existing tenant-admin pages pattern which use client fetch via `lib/api.ts`)
- Fetches report data via `tenantFinanceReportsApi` using subdomain from `useParams()`
- Renders title + period + summary cards + data table
- "Export CSV" button (client-side — generates CSV blob from JSON, triggers download). TODO marker for native Excel/PDF (out of MVP scope).
- Loading + error states

Files:
- `sales-book/page.tsx`
- `purchase-book/page.tsx`
- `vat-return/page.tsx`
- `tds-summary/page.tsx`
- `deferred-revenue/page.tsx`
- `ar-aging/page.tsx`
- `ap-aging/page.tsx`
- `cancelled-bills/page.tsx`
- `reprint-log/page.tsx`
- `audit-trail/page.tsx`
- `cbms-sync-status/page.tsx` (also has a "Retry failed" button → `POST /api/finance/cbms/retry` — TODO stub since retry endpoint doesn't exist; show alert "Backend retry not implemented")

### `[NEW] apps/tenant-admin/app/(admin)/reports/finance/{statement}/page.tsx`
Wrap the existing NFRS reports (balance-sheet, income-statement, trial-balance, cash-flow) which are backend-ready but have no UI. Reuse the same client pattern. 4 files.

### `[MODIFY] apps/tenant-admin/app/(admin)/layout.tsx`
Add a "Reports" entry to the `NAV` array (after Finance). Link to `/reports`.

### `[MODIFY] apps/tenant-admin/lib/domain-config.ts`
For MVP, no change needed — Finance menu already exists per-domain. Reports are a sub-page of Finance via the layout nav.

---

## Out of scope for this pass (TODO markers in code)

- Native Excel/.xlsx / XML / PDF export (CSV-only for MVP)
- Schedule 8 (10% VAT refund) transmission to payment operators — backend tx flow, needs payment-operator integration work
- CBMS retry / sync-trigger endpoints (only read-only status for MVP)
- IRD-style PDF invoice watermark ("प्रतिलिपि") — needs template engine
- Real-time CBMS sync on invoice issuance (separate workstream 4.7)
- Unit tests / e2e tests — manual smoke tests only for MVP
- Multi-prisma-tenant filter — the existing `ReportsService` already uses `req.user.tenantId` from JWT, so all new endpoints inherit tenant isolation automatically

---

## Verification (after implementation)

1. `cd apps/api && npx tsc --noEmit` — backend compiles
- `cd apps/tenant-admin && npx tsc --noEmit` — frontend compiles
- Manual: with `npm run dev:api` + `npm run dev:tenant-admin` running, log in as `admin@vrfitness.com` / `Admin123!` at `http://localhost:4006`, click **Reports** in sidebar, open sales-book page, verify table renders (may be empty if no invoices seeded in date range — acceptable for MVP).

---

## Effort estimate

- Backend service + controller: 11 methods × ~30 lines = ~330 LOC
- Tenant-admin lib/api.ts: ~80 LOC
- 11 IRD report pages × ~120 LOC = ~1320 LOC
- 4 NFRS report pages × ~120 LOC = ~480 LOC
- Reports landing + layout = ~200 LOC
- **Total: ~2400 LOC across ~20 files. Single pass, no migration.**

Halt point: awaiting approval to execute.

---

## Risks

1. **Empty seed data** — `vrfitness` tenant may not have MasterBill rows seeded. The Finance seed script (`seed-fitness-center.js`) seeds CoA + invoices but I haven't verified MasterBill coverage. MVP pages render "No data in selected period" gracefully.
2. **Tenant ID resolution** — `req.user.tenantId` is relied on; if the JwtAuthGuard doesn't populate it, all 11 endpoints will fail. Existing endpoints work this way (see `getBalanceSheet(req.user.tenantId, ...)`), so this is a non-risk.
3. **CSV export filename collisions** — Use `reportName_{startDate}_{endDate}.csv` format and `Blob` + `URL.createObjectURL`. Standard pattern.