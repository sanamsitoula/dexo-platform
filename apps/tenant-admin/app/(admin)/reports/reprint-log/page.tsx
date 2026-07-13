'use client'

import { useEffect, useState } from 'react'
import { tenantFinanceReportsApi } from '@/lib/api'
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { ReportHeader, StatCard, EmptyState, ErrorState, LoadingState, formatDateTime, defaultPeriod, downloadCsv } from '@/lib/report-utils'

export default function ReprintLogPage() {
  const subdomain = resolveTenantAdminSubdomain();
  const { startDate, endDate } = defaultPeriod()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true); setError(null)
    tenantFinanceReportsApi.getReprintLog(subdomain, startDate, endDate).then((r) => {
      if (r.error) setError(r.error); else setData(r.data)
    }).finally(() => setLoading(false))
  }, [subdomain, startDate, endDate])

  return (
    <div>
      <ReportHeader
        title="Reprint Log"
        subtitle="IRD-mandated log of ORIGINAL vs COPY bill prints"
        startDate={startDate}
        endDate={endDate}
        onExport={() => data?.rows && downloadCsv(`reprint-log_${startDate}_${endDate}.csv`, data.rows.map((r: any) => ({
          billNo: r.billNo, invoiceNumber: r.invoiceNumber, printType: r.printType, copyNumber: r.copyNumber,
          printedBy: r.printedBy, printedAt: formatDateTime(r.printedAt), reason: r.reason, ipAddress: r.ipAddress,
        })))}
      />
      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && !error && data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <StatCard label="Total Reprints" value={data.count} />
          </div>
          {data.rows.length === 0 ? <EmptyState /> : (
            <div className="overflow-x-auto bg-white rounded-lg shadow">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                  <tr>
                    <th className="px-3 py-2 text-left">Bill No</th>
                    <th className="px-3 py-2 text-left">Invoice #</th>
                    <th className="px-3 py-2 text-center">Type</th>
                    <th className="px-3 py-2 text-center">Copy #</th>
                    <th className="px-3 py-2 text-left">Printed By</th>
                    <th className="px-3 py-2 text-left">Printed At</th>
                    <th className="px-3 py-2 text-left">Reason</th>
                    <th className="px-3 py-2 text-left">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.rows.map((r: any, i: number) => (
                    <tr key={i} className={r.printType === 'COPY' ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
                      <td className="px-3 py-2 font-mono">{r.billNo}</td>
                      <td className="px-3 py-2 font-mono">{r.invoiceNumber}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs ${r.printType === 'ORIGINAL' ? 'bg-emerald-100 text-emerald-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {r.printType}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">{r.copyNumber}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.printedBy}</td>
                      <td className="px-3 py-2">{formatDateTime(r.printedAt)}</td>
                      <td className="px-3 py-2">{r.reason || '—'}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.ipAddress || '—'}</td>
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