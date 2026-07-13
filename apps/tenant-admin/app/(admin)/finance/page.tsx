'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { tenantAccountsApi } from '@/lib/api'
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { StatCard, formatNumber } from '@/lib/report-utils'

export default function FinancePage() {
  const subdomain = resolveTenantAdminSubdomain();
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    tenantAccountsApi.list(subdomain).then((r) => {
      if (r.data) {
        const byType = r.data.reduce((acc: any, a: any) => {
          acc[a.accountType] = (acc[a.accountType] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        setSummary({ total: r.data.length, byType })
      }
    }).finally(() => setLoading(false))
  }, [subdomain])

  const CARDS = [
    { href: '/finance/invoices', title: 'Invoices & Bills', desc: 'Tax invoices — view & print (PDF)', icon: '🧾' },
    { href: '/finance/accounts', title: 'Chart of Accounts', desc: 'Ledger heads & sub-accounts (NFRS) — load defaults', icon: '📓' },
    { href: '/finance/fiscal-years', title: 'Fiscal Years', desc: 'Active year · English / Nepali calendar', icon: '🗓️' },
    { href: '/finance/journal', title: 'Journal Entries', desc: 'Create manual double-entry postings', icon: '✍️' },
    { href: '/reports/finance/trial-balance', title: 'Trial Balance', desc: 'Debit/credit totals per account', icon: '⚖️' },
    { href: '/reports/finance/balance-sheet', title: 'Balance Sheet', desc: 'Assets, liabilities & equity', icon: '📊' },
    { href: '/reports/finance/income-statement', title: 'Income Statement', desc: 'Profit & loss for a period', icon: '💰' },
    { href: '/reports/sales-book', title: 'IRD Reports', desc: 'Sales book, VAT, TDS, CBMS sync', icon: '🇳🇵' },
  ]

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Finance &amp; Accounting</h2>
      <p className="text-sm text-gray-500 mb-5">Double-entry bookkeeping · Nepal NFRS · NPR currency · VAT 13%</p>

      {!loading && summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard label="Total Accounts" value={summary.total} hint="ledger heads + sub-accounts" />
          <StatCard label="Asset Accounts" value={summary.byType.ASSET || 0} />
          <StatCard label="Liability + Equity" value={(summary.byType.LIABILITY || 0) + (summary.byType.EQUITY || 0)} />
          <StatCard label="Revenue + Expense" value={(summary.byType.REVENUE || 0) + (summary.byType.EXPENSE || 0) + (summary.byType.COGS || 0)} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="block bg-white rounded-lg shadow p-5 hover:shadow-md hover:border-emerald-300 border border-transparent transition"
          >
            <div className="text-2xl mb-2">{c.icon}</div>
            <div className="font-semibold text-gray-900">{c.title}</div>
            <div className="text-sm text-gray-500 mt-1">{c.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
