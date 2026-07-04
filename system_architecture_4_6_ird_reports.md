# Architecture Note — IRD Reports (workstream 4.6)

## Pattern used

Tenant-admin report pages follow this structure:

1. **`'use client'`** component (per existing tenant-admin pages pattern)
2. **`useParams()`** → `subdomain` (default to `vrfitness`)
3. **`useState`** for `data`, `loading`, `error`
4. **`useEffect`** fetches data via `tenantFinanceReportsApi.<method>(subdomain, ...)` from `lib/api.ts`
5. **Shared UI** via `lib/report-utils.tsx` (ReportHeader, StatCard, EmptyState, ErrorState, LoadingState, downloadCsv, formatters)
6. **CSV export** computed client-side from JSON response; triggers `Blob` download

## API route map

All under `Controller('finance/reports')` + `@UseGuards(JwtAuthGuard)` → all tenant-isolated via `req.user.tenantId`. No new guards, no new middleware.

| Method | Path | Source |
|--------|------|--------|
| GET | `/finance/reports/sales-book` | `MasterBill` joined to `Invoice.customer` |
| GET | `/finance/reports/purchase-book` | `Bill` joined to `Supplier` |
| GET | `/finance/reports/vat-return` | Output VAT (invoices) - Input VAT (bills) |
| GET | `/finance/reports/tds-summary` | `PaymentMade` grouped by `payeeType:payeeId` |
| GET | `/finance/reports/deferred-revenue` | `ChartOfAccount` code starts with `213` |
| GET | `/finance/reports/ar-aging` | `Invoice` (UNPAID/PARTIAL) bucketed by days |
| GET | `/finance/reports/ap-aging` | `Bill` (UNPAID/PARTIAL) bucketed by days |
| GET | `/finance/reports/cancelled-bills` | `Invoice` where `isActive=false` |
| GET | `/finance/reports/reprint-log` | `ReprintLog` joined to `Invoice` |
| GET | `/finance/reports/audit-trail` | `FinanceAuditLog` (capped at 1000 in MVP) |
| GET | `/finance/reports/cbms-sync-status` | `MasterBill` counts + `CbmsSyncQueue` (PENDING/FAILED) |
| GET | `/finance/reports/summary` | aggregate counts for landing page |

## File extension gotcha

`apps/tenant-admin/lib/report-utils.tsx` must use `.tsx` extension (not `.ts`) because it contains JSX (StatCard, EmptyState, etc). The TS config uses `jsx: preserve` and only applies JSX parsing to `.tsx` files.

## Known MVP gaps (TODO markers in code)

- Investing/Financing cash-flow allocation — shows 0; cash flow only models operating activities from `paymentReceived`/`paymentMade`
- CBMS retry endpoint stub — no `POST /api/finance/cbms/retry` endpoint exists; UI button calls `alert()`
- Audit trail returns max 1000 rows in MVP (controller has `take: 1000` in service)
- Export formats: CSV-only. TODOs in each page for Excel/PDF.

## Next workstream

Per `todo.md` Phase 4: remaining workstreams are 4.1 (launch essentials), 4.2 (WhatsApp), 4.3 (Contact Us), 4.4 (platform billing env), 4.5 (NFRS reports UI — completed as part of this pass since we built the NFRS pages too), 4.7 (live IRD ops for fitness).