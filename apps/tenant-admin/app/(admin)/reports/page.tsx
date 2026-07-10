import Link from 'next/link'

export default function ReportsLanding() {
  const nfrsReports = [
    { href: '/reports/finance/balance-sheet', title: 'Balance Sheet', desc: 'Statement of Financial Position (NFRS)' },
    { href: '/reports/finance/income-statement', title: 'Income Statement', desc: 'Statement of Profit or Loss (NFRS)' },
    { href: '/reports/finance/trial-balance', title: 'Trial Balance', desc: 'Debit/Credit totals and balance check' },
    { href: '/reports/finance/cash-flow', title: 'Cash Flow', desc: 'Operating / Investing / Financing activities' },
    { href: '/reports/finance/accounts-receivable', title: 'Accounts Receivable', desc: 'Open member invoices and AR aging snapshot' },
  ]

  const irdReports = [
    { href: '/reports/sales-book', title: 'Sales Book', desc: 'IRD Schedule 6D — sales register. Excel/XML/PDF export target.', countKey: 'invoices' },
    { href: '/reports/purchase-book', title: 'Purchase Book', desc: 'Purchase register from VAT-registered suppliers', countKey: 'bills' },
    { href: '/reports/vat-return', title: 'VAT Return', desc: 'Output VAT vs Input VAT — Net Payable computation' },
    { href: '/reports/tds-summary', title: 'TDS Summary', desc: 'Tax Deducted at Source per payee (contractor/rent/etc.)' },
    { href: '/reports/deferred-revenue', title: 'Deferred Revenue', desc: 'Schedule of unearned membership revenue (NFRS 15)' },
    { href: '/reports/ar-aging', title: 'AR Aging', desc: 'Member receivables bucketed 0–30 / 31–60 / 61–90 / 90+' },
    { href: '/reports/ap-aging', title: 'AP Aging', desc: 'Supplier payables bucketed 0–30 / 31–60 / 61–90 / 90+' },
    { href: '/reports/cancelled-bills', title: 'Cancelled Bills', desc: 'IRD audit register of voided invoices with reason' },
    { href: '/reports/reprint-log', title: 'Reprint Log', desc: 'IRD-mandated log of ORIGINAL vs COPY bill prints' },
    { href: '/reports/audit-trail', title: 'Audit Trail', desc: 'User-action log on all financial records (IRD §17.2)' },
    { href: '/reports/cbms-sync-status', title: 'CBMS Sync Status', desc: 'Real-time sync queue health with Nepal IRD CBMS' },
  ]

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Financial Reports</h2>
      <p className="mt-1 text-gray-500">NFRS-compliant financial statements + IRD electronic billing reports (Nepal).</p>

      <section className="mt-8">
        <h3 className="text-lg font-semibold text-gray-800">NFRS Financial Statements</h3>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {nfrsReports.map((r) => (
            <Link
              key={r.href}
              href={r.href}
              className="block bg-white rounded-lg shadow p-5 hover:shadow-md hover:border-emerald-300 border border-transparent"
            >
              <div className="font-semibold text-gray-900">{r.title}</div>
              <div className="mt-1 text-sm text-gray-500">{r.desc}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h3 className="text-lg font-semibold text-gray-800">IRD Compliance Reports</h3>
        <p className="mt-1 text-sm text-gray-500">
          Per IRD Electronic Billing Procedure 2074 (4th Amendment). Exportable to Excel / XML / PDF (CSV in MVP).
        </p>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {irdReports.map((r) => (
            <Link
              key={r.href}
              href={r.href}
              className="block bg-white rounded-lg shadow p-5 hover:shadow-md hover:border-orange-300 border border-transparent"
            >
              <div className="font-semibold text-gray-900">{r.title}</div>
              <div className="mt-1 text-sm text-gray-500">{r.desc}</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}