'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { tenantFinanceReportsApi } from '@/lib/api'
import { ReportHeader, StatCard, EmptyState, ErrorState, LoadingState, formatNumber, formatDateTime, defaultPeriod, downloadCsv } from '@/lib/report-utils'

export default function CancelledBillsPage() {
  const params = useParams()
  const subdomain = (params?.subdomain as string) || 'vrfitness'
  const { startDate, endDate } = defaultPeriod()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true); setError(null)
    tenantFinanceReportsApi.getCancelledBills(subdomain, startDate, endDate).then((r) => {
      if (r.error) setError(r.error); else setData(r.data)
    }).finally(() => setLoading(false))
  }, [subdomain, startDate, endDate])

  return (
    <div>
      <ReportHeader
        title="Cancelled Bills Register"
        subtitle="IRD audit — voided invoices with reason (no physical delete)"
        startDate={startDate}
        endDate={endDate}
        onExport={() => data?.rows && downloadCsv(`cancelled-bills_${startDate}_${endDate}.csv`, data.rows.map((r: any) => ({
          invoiceNumber: r.invoiceNumber, customerName: r.customerName, invoiceDate: formatDateTime(r.invoiceDate),
          cancelledAt: formatDateTime(r.cancelledAt), cancelledBy: r.cancelledBy, cancelReason: r.cancelReason, totalAmount: r.totalAmount.toString(),
        })))}
      />
      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && !error && data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <StatCard label="Cancelled Bills" value={data.count} />
          </div>
          {data.rows.length === 0 ? <EmptyState /> : (
            <div className="overflow-x-auto bg-white rounded-lg shadow">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                  <tr>
                    <th className="px-3 py-2 text-left">Invoice #</th>
                    <th className="px-3 py-2 text-left">Customer</th>
                    <th className="px-3 py-2 text-left">Invoice Date</th>
                    <th className="px-3 py-2 text-left">Cancelled At</th>
                    <th className="px-3 py-2 text-left">By</th>
                    <th className="px-3 py-2 text-left">Reason</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.rows.map((r: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono">{r.invoiceNumber}</td>
                      <td className="px-3 py-2">{r.customerName}</td>
                      <td className="px-3 py-2">{formatDateTime(r.invoiceDate)}</td>
                      <td className="px-3 py-2">{formatDateTime(r.cancelledAt)}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.cancelledBy || '—'}</td>
                      <td className="px-3 py-2">{r.cancelReason || '—'}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(r.totalAmount)}</td>
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