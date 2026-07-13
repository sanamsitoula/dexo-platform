'use client'

import { useEffect, useState } from 'react'
import { tenantFinanceReportsApi } from '@/lib/api'
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { ReportHeader, StatCard, EmptyState, ErrorState, LoadingState, formatNumber, formatDate, defaultPeriod, downloadCsv } from '@/lib/report-utils'

export default function SalesBookPage() {
  const subdomain = resolveTenantAdminSubdomain();
  const { startDate, endDate } = defaultPeriod()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true); setError(null)
    tenantFinanceReportsApi.getSalesBook(subdomain, startDate, endDate).then((r) => {
      if (r.error) setError(r.error); else setData(r.data)
    }).finally(() => setLoading(false))
  }, [subdomain, startDate, endDate])

  return (
    <div>
      <ReportHeader
        title="Sales Book — बिक्री खाता"
        subtitle="IRD Schedule 6D — sales register"
        startDate={startDate}
        endDate={endDate}
        onExport={() => data?.rows && downloadCsv(`sales-book_${startDate}_${endDate}.csv`, data.rows)}
      />
      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && !error && data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Bills" value={data.totals.count} />
            <StatCard label="Taxable Amount" value={formatNumber(data.totals.totalTaxable)} />
            <StatCard label="VAT Collected" value={formatNumber(data.totals.totalVat)} />
            <StatCard label="Total Amount" value={formatNumber(data.totals.totalAmount)} />
          </div>
          {data.rows.length === 0 ? <EmptyState /> : (
            <div className="overflow-x-auto bg-white rounded-lg shadow">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                  <tr>
                    <th className="px-3 py-2 text-left">Bill Date</th>
                    <th className="px-3 py-2 text-left">Bill No</th>
                    <th className="px-3 py-2 text-left">Buyer Name</th>
                    <th className="px-3 py-2 text-left">Buyer PAN</th>
                    <th className="px-3 py-2 text-right">Taxable</th>
                    <th className="px-3 py-2 text-right">VAT</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2 text-left">Payment</th>
                    <th className="px-3 py-2 text-center">Synced</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.rows.map((r: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2">{formatDate(r.billDate)}</td>
                      <td className="px-3 py-2 font-mono">{r.billNo}</td>
                      <td className="px-3 py-2">{r.customerName || '—'}</td>
                      <td className="px-3 py-2 font-mono">{r.customerPan || '—'}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(r.taxableAmount)}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(r.taxAmount)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{formatNumber(r.totalAmount)}</td>
                      <td className="px-3 py-2">{r.paymentMethod || '—'}</td>
                      <td className="px-3 py-2 text-center">{r.syncWithIrd ? '✓' : '✗'}</td>
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