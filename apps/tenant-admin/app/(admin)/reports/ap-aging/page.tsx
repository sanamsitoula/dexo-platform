'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { tenantFinanceReportsApi } from '@/lib/api'
import { ReportHeader, StatCard, EmptyState, ErrorState, LoadingState, formatNumber, formatDate, downloadCsv } from '@/lib/report-utils'

export default function ApAgingPage() {
  const params = useParams()
  const subdomain = (params?.subdomain as string) || 'vrfitness'
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true); setError(null)
    tenantFinanceReportsApi.getApAging(subdomain, asOfDate).then((r) => {
      if (r.error) setError(r.error); else setData(r.data)
    }).finally(() => setLoading(false))
  }, [subdomain, asOfDate])

  return (
    <div>
      <ReportHeader
        title="AP Aging"
        subtitle="Payables to suppliers bucketed by days past issue"
        startDate={asOfDate}
        endDate={asOfDate}
        onExport={() => data?.rows && downloadCsv(`ap-aging_${asOfDate}.csv`, data.rows.map((r: any) => ({
          billNumber: r.billNumber, supplierName: r.supplierName, billDate: formatDate(r.billDate),
          totalAmount: r.totalAmount.toString(), paidAmount: r.paidAmount.toString(), outstanding: r.outstanding.toString(), daysOutstanding: r.daysOutstanding,
        })))}
      />
      <div className="mb-4">
        <label className="text-sm text-gray-600 mr-2">As of:</label>
        <input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} className="border rounded px-2 py-1 text-sm" />
      </div>
      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && !error && data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            <StatCard label="0–30 days" value={formatNumber(data.buckets.current)} />
            <StatCard label="31–60 days" value={formatNumber(data.buckets.days30)} />
            <StatCard label="61–90 days" value={formatNumber(data.buckets.days60)} />
            <StatCard label="91–120" value={formatNumber(data.buckets.days90)} />
            <StatCard label="120+" value={formatNumber(data.buckets.over90)} />
          </div>
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded">
            <div className="text-sm text-amber-900">
              Total payable: <strong className="font-mono">{formatNumber(data.totalOutstanding)}</strong> across <strong>{data.count}</strong> bills
            </div>
          </div>
          {data.rows.length === 0 ? <EmptyState /> : (
            <div className="overflow-x-auto bg-white rounded-lg shadow">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                  <tr>
                    <th className="px-3 py-2 text-left">Bill #</th>
                    <th className="px-3 py-2 text-left">Supplier</th>
                    <th className="px-3 py-2 text-left">Issued</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2 text-right">Paid</th>
                    <th className="px-3 py-2 text-right">Outstanding</th>
                    <th className="px-3 py-2 text-center">Days</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.rows.map((r: any, i: number) => (
                    <tr key={i} className={r.daysOutstanding > 90 ? 'bg-red-50' : 'hover:bg-gray-50'}>
                      <td className="px-3 py-2 font-mono">{r.billNumber}</td>
                      <td className="px-3 py-2">{r.supplierName}</td>
                      <td className="px-3 py-2">{formatDate(r.billDate)}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(r.totalAmount)}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(r.paidAmount)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{formatNumber(r.outstanding)}</td>
                      <td className="px-3 py-2 text-center">{r.daysOutstanding}</td>
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