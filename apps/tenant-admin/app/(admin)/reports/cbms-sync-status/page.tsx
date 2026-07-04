'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { tenantFinanceReportsApi } from '@/lib/api'
import { ReportHeader, StatCard, EmptyState, ErrorState, LoadingState, formatDateTime, downloadCsv } from '@/lib/report-utils'

export default function CbmsSyncStatusPage() {
  const params = useParams()
  const subdomain = (params?.subdomain as string) || 'vrfitness'
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true); setError(null)
    tenantFinanceReportsApi.getCbmsSyncStatus(subdomain).then((r) => {
      if (r.error) setError(r.error); else setData(r.data)
    }).finally(() => setLoading(false))
  }, [subdomain])

  return (
    <div>
      <ReportHeader
        title="CBMS Sync Status"
        subtitle="Real-time invoice sync queue with Nepal IRD CBMS"
        onExport={() => data?.failedQueue && downloadCsv(`cbms-sync-status_${new Date().toISOString().slice(0, 10)}.csv`, data.failedQueue.map((q: any) => ({
          id: q.id, invoiceId: q.invoiceId, operation: q.operation, status: q.status, attemptCount: q.attemptCount,
          errorMessage: q.errorMessage, createdAt: formatDateTime(q.createdAt), lastAttemptedAt: formatDateTime(q.lastAttemptedAt),
        })))}
      />
      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && !error && data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <StatCard label="Synced to CBMS" value={data.syncedCount} />
            <StatCard label="Pending" value={data.pendingCount} />
            <StatCard
              label="Oldest Pending"
              value={data.oldestPendingAgeHours ? `${data.oldestPendingAgeHours}h` : '—'}
              hint={data.needsAttention ? '⚠ ATTENTION: pending > 24h' : 'Within SLA'}
            />
          </div>
          {data.needsAttention && (
            <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-sm text-red-800">
              ⚠ Action required: bills unsynced for &gt; 24 hours. Risk of IRD notice. Backend retry endpoint not implemented in MVP — see implementation_plan_4_6_ird_reports.md §6.4.
            </div>
          )}
          {/* TODO: hook up POST /api/finance/cbms/retry when it exists */}
          <button
            type="button"
            onClick={() => alert('Backend retry endpoint not implemented (MVP scope).')}
            className="mb-4 px-3 py-2 text-sm font-medium rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            ↻ Retry Failed Syncs
          </button>
          {data.failedQueue.length === 0 ? (
            <EmptyState message="No failed CBMS syncs. All bills up to date." />
          ) : (
            <div className="overflow-x-auto bg-white rounded-lg shadow">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                  <tr>
                    <th className="px-3 py-2 text-left">Invoice ID</th>
                    <th className="px-3 py-2 text-center">Operation</th>
                    <th className="px-3 py-2 text-center">Status</th>
                    <th className="px-3 py-2 text-center">Attempts</th>
                    <th className="px-3 py-2 text-left">Last Attempt</th>
                    <th className="px-3 py-2 text-left">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.failedQueue.map((q: any) => (
                    <tr key={q.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-xs">{q.invoiceId}</td>
                      <td className="px-3 py-2 text-center">{q.operation}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          q.status === 'FAILED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {q.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">{q.attemptCount}</td>
                      <td className="px-3 py-2">{formatDateTime(q.lastAttemptedAt)}</td>
                      <td className="px-3 py-2 text-xs text-red-700 max-w-xs truncate" title={q.errorMessage}>
                        {q.errorMessage || '—'}
                      </td>
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