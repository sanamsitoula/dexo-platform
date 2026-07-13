'use client'

import { useEffect, useState } from 'react'
import { tenantFinanceReportsApi } from '@/lib/api'
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { ReportHeader, StatCard, EmptyState, ErrorState, LoadingState, formatDateTime, defaultPeriod, downloadCsv } from '@/lib/report-utils'

export default function AuditTrailPage() {
  const subdomain = resolveTenantAdminSubdomain();
  const { startDate, endDate } = defaultPeriod()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({ tableName: '', action: '', actionBy: '' })

  useEffect(() => {
    setLoading(true); setError(null)
    const f: any = {}
    if (filters.tableName) f.tableName = filters.tableName
    if (filters.action) f.action = filters.action
    if (filters.actionBy) f.actionBy = filters.actionBy
    tenantFinanceReportsApi.getAuditTrail(subdomain, startDate, endDate, f).then((r) => {
      if (r.error) setError(r.error); else setData(r.data)
    }).finally(() => setLoading(false))
  }, [subdomain, startDate, endDate, filters])

  return (
    <div>
      <ReportHeader
        title="Audit Trail"
        subtitle="User-action log on all financial records — IRD §17.2 mandatory"
        startDate={startDate}
        endDate={endDate}
        onExport={() => data?.rows && downloadCsv(`audit-trail_${startDate}_${endDate}.csv`, data.rows.map((r: any) => ({
          actionAt: formatDateTime(r.actionAt), tableName: r.tableName, recordId: r.recordId, action: r.action, actionBy: r.actionBy, ipAddress: r.ipAddress,
        })))}
      />
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          placeholder="Table (e.g. invoices)"
          value={filters.tableName}
          onChange={(e) => setFilters({ ...filters, tableName: e.target.value })}
          className="border rounded px-2 py-1 text-sm"
        />
        <input
          placeholder="Action (INSERT/UPDATE/CANCEL)"
          value={filters.action}
          onChange={(e) => setFilters({ ...filters, action: e.target.value })}
          className="border rounded px-2 py-1 text-sm"
        />
        <input
          placeholder="User ID"
          value={filters.actionBy}
          onChange={(e) => setFilters({ ...filters, actionBy: e.target.value })}
          className="border rounded px-2 py-1 text-sm"
        />
      </div>
      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && !error && data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <StatCard label="Audit Entries" value={data.count} hint="Capped at 1000 in MVP" />
          </div>
          {data.rows.length === 0 ? <EmptyState /> : (
            <div className="overflow-x-auto bg-white rounded-lg shadow">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                  <tr>
                    <th className="px-3 py-2 text-left">Time</th>
                    <th className="px-3 py-2 text-left">Table</th>
                    <th className="px-3 py-2 text-center">Action</th>
                    <th className="px-3 py-2 text-left">Record ID</th>
                    <th className="px-3 py-2 text-left">User</th>
                    <th className="px-3 py-2 text-left">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.rows.map((r: any, i: number) => (
                    <tr key={r.id ?? i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-xs">{formatDateTime(r.actionAt)}</td>
                      <td className="px-3 py-2 font-mono">{r.tableName}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          r.action === 'CANCEL' ? 'bg-red-100 text-red-800' :
                          r.action === 'PRINT' || r.action === 'REPRINT' ? 'bg-yellow-100 text-yellow-800' :
                          r.action === 'SYNC' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {r.action}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{r.recordId}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.actionBy}</td>
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