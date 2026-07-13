'use client'

import { useEffect, useState } from 'react'
import { tenantFinanceReportsApi } from '@/lib/api'
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { ReportHeader, StatCard, EmptyState, ErrorState, LoadingState, formatNumber, formatDate, downloadCsv } from '@/lib/report-utils'

export default function DeferredRevenuePage() {
  const subdomain = resolveTenantAdminSubdomain();
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true); setError(null)
    tenantFinanceReportsApi.getDeferredRevenue(subdomain, asOfDate).then((r) => {
      if (r.error) setError(r.error); else setData(r.data)
    }).finally(() => setLoading(false))
  }, [subdomain, asOfDate])

  return (
    <div>
      <ReportHeader
        title="Deferred Revenue Schedule"
        subtitle="Unearned membership revenue — recognized over the membership period (NFRS 15)"
        startDate={asOfDate}
        endDate={asOfDate}
        onExport={() => data?.rows && downloadCsv(`deferred-revenue_${asOfDate}.csv`, data.rows.map((r: any) => ({
          accountCode: r.accountCode, accountName: r.accountName, balance: r.balance.toString(),
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <StatCard label="Accounts" value={data.rows.length} />
            <StatCard label="Total Deferred" value={formatNumber(data.totalDeferred)} />
          </div>
          {data.rows.length === 0 ? <EmptyState /> : (
            <div className="overflow-x-auto bg-white rounded-lg shadow">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                  <tr>
                    <th className="px-3 py-2 text-left">Account Code</th>
                    <th className="px-3 py-2 text-left">Account Name</th>
                    <th className="px-3 py-2 text-right">Balance (NPR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.rows.map((r: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono">{r.accountCode}</td>
                      <td className="px-3 py-2">{r.accountName}</td>
                      <td className="px-3 py-2 text-right font-semibold">{formatNumber(r.balance)}</td>
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