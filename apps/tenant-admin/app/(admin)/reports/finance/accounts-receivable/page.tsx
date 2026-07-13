'use client'

import { useEffect, useState } from 'react'
import { tenantFinanceReportsApi } from '@/lib/api'
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { ReportHeader, StatCard, EmptyState, ErrorState, LoadingState, formatNumber, formatDate, downloadCsv } from '@/lib/report-utils'

export default function AccountsReceivablePage() {
  const subdomain = resolveTenantAdminSubdomain();
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true); setError(null)
    tenantFinanceReportsApi.getAccountsReceivable(subdomain).then((r) => {
      if (r.error) setError(r.error); else setData(r.data)
    }).finally(() => setLoading(false))
  }, [subdomain])

  return (
    <div>
      <ReportHeader
        title="Accounts Receivable"
        subtitle="Open member invoices and aging snapshot"
        onExport={() => data?.invoices && downloadCsv(`accounts-receivable_${new Date().toISOString().slice(0, 10)}.csv`, data.invoices.map((r: any) => ({
          invoiceId: r.invoiceId, invoiceNumber: r.invoiceNumber, customerName: r.customerName, invoiceDate: formatDate(r.invoiceDate),
          totalAmount: r.totalAmount.toString(), paidAmount: r.paidAmount.toString(), outstanding: r.outstanding.toString(), daysOverdue: r.daysOverdue,
        })))}
      />
      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && !error && data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            <StatCard label="Total Outstanding" value={formatNumber(data.totalOutstanding)} />
            <StatCard label="Current" value={formatNumber(data.aging.current)} />
            <StatCard label="≤ 60 days" value={formatNumber(data.aging.days30)} />
            <StatCard label="≤ 90 days" value={formatNumber(data.aging.days60)} />
            <StatCard label="120+" value={formatNumber(data.aging.over90)} />
          </div>
          {data.invoices.length === 0 ? <EmptyState /> : (
            <div className="overflow-x-auto bg-white rounded-lg shadow">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                  <tr>
                    <th className="px-3 py-2 text-left">Invoice #</th>
                    <th className="px-3 py-2 text-left">Customer</th>
                    <th className="px-3 py-2 text-left">Issued</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2 text-right">Paid</th>
                    <th className="px-3 py-2 text-right">Outstanding</th>
                    <th className="px-3 py-2 text-center">Days Overdue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.invoices.map((r: any, i: number) => (
                    <tr key={i} className={r.daysOverdue > 60 ? 'bg-red-50' : 'hover:bg-gray-50'}>
                      <td className="px-3 py-2 font-mono">{r.invoiceNumber}</td>
                      <td className="px-3 py-2">{r.customerName}</td>
                      <td className="px-3 py-2">{formatDate(r.invoiceDate)}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(r.totalAmount)}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(r.paidAmount)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{formatNumber(r.outstanding)}</td>
                      <td className="px-3 py-2 text-center">{r.daysOverdue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}