'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { tenantFinanceReportsApi } from '@/lib/api'
import { ReportHeader, StatCard, EmptyState, ErrorState, LoadingState, formatNumber, formatDate, defaultPeriod, downloadCsv } from '@/lib/report-utils'

export default function TdsSummaryPage() {
  const params = useParams()
  const subdomain = (params?.subdomain as string) || 'vrfitness'
  const { startDate, endDate } = defaultPeriod()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true); setError(null)
    tenantFinanceReportsApi.getTdsSummary(subdomain, startDate, endDate).then((r) => {
      if (r.error) setError(r.error); else setData(r.data)
    }).finally(() => setLoading(false))
  }, [subdomain, startDate, endDate])

  return (
    <div>
      <ReportHeader
        title="TDS Deducted Summary"
        subtitle="Tax Deducted at Source per payee — deposit to IRD by 25th of next month"
        startDate={startDate}
        endDate={endDate}
        onExport={() => data?.rows && downloadCsv(`tds-summary_${startDate}_${endDate}.csv`, data.rows.map((r: any) => ({
          payeeType: r.payeeType, payeeId: r.payeeId, gross: r.gross.toString(), tds: r.tds.toString(), netPaid: r.netPaid.toString(), count: r.count,
        })))}
      />
      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && !error && data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <StatCard label="Payees" value={data.totals.count} />
            <StatCard label="Total Gross" value={formatNumber(data.totals.totalGross)} />
            <StatCard label="Total TDS" value={formatNumber(data.totals.totalTds)} />
          </div>
          {data.rows.length === 0 ? <EmptyState /> : (
            <div className="overflow-x-auto bg-white rounded-lg shadow">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                  <tr>
                    <th className="px-3 py-2 text-left">Payee Type</th>
                    <th className="px-3 py-2 text-left">Payee ID</th>
                    <th className="px-3 py-2 text-right">Gross</th>
                    <th className="px-3 py-2 text-right">TDS</th>
                    <th className="px-3 py-2 text-right">Net Paid</th>
                    <th className="px-3 py-2 text-center">Payments</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.rows.map((r: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2">{r.payeeType}</td>
                      <td className="px-3 py-2 font-mono">{r.payeeId}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(r.gross)}</td>
                      <td className="px-3 py-2 text-right text-red-600 font-semibold">({formatNumber(r.tds)})</td>
                      <td className="px-3 py-2 text-right">{formatNumber(r.netPaid)}</td>
                      <td className="px-3 py-2 text-center">{r.count}</td>
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