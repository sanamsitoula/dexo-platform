'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { auditApi } from '@/lib/api'

interface AuditLog {
  id: string
  action: string
  resourceType: string | null
  resourceId: string | null
  userId: string | null
  changes: any
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  user?: { email: string; firstName: string; lastName: string } | null
  tenant?: { id: string; name: string; subdomain: string } | null
}

interface AuditStats {
  total: number
  last30Days: number
  byAction: { action: string; _count: number }[]
  byResourceType: { resourceType: string | null; _count: number }[]
  topUsers: { userId: string; _count: number }[]
}

export default function AuditPage() {
  const { user } = useAuth()
  const isPlatformAdmin = !!user?.isPlatformAdmin
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actions, setActions] = useState<string[]>([])
  const [stats, setStats] = useState<AuditStats | null>(null)
  const [offset, setOffset] = useState(0)
  const limit = 50

  // Filters
  const [actionFilter, setActionFilter] = useState('')
  const [resourceFilter, setResourceFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    auditApi.getActions().then((r) => r.data && setActions(r.data))
    auditApi.getStats().then((r) => r.data && setStats(r.data))
    fetchLogs()
  }, [offset])

  async function fetchLogs() {
    setLoading(true)
    setError(null)
    const response = await auditApi.getLogs({
      limit,
      offset,
      action: actionFilter || undefined,
      resourceType: resourceFilter || undefined,
      userId: userFilter || undefined,
      search: search || undefined,
    })
    if (response.data) {
      const data = response.data as any
      setLogs(Array.isArray(data) ? data : data.logs || [])
      setTotal(typeof data === 'object' && data.total ? data.total : Array.isArray(data) ? data.length : 0)
    } else if (response.error) {
      setError(response.error)
    }
    setLoading(false)
  }

  function applyFilters() {
    setOffset(0)
    fetchLogs()
  }

  function actionColor(action: string) {
    if (action.startsWith('user.login')) return 'bg-green-100 text-green-800'
    if (action.startsWith('user.logout')) return 'bg-gray-100 text-gray-800'
    if (action.startsWith('user.failed')) return 'bg-red-100 text-red-800'
    if (action.startsWith('user.created')) return 'bg-emerald-100 text-emerald-800'
    if (action.startsWith('user.deleted')) return 'bg-red-100 text-red-800'
    if (action.startsWith('user.invited')) return 'bg-cyan-100 text-cyan-800'
    if (action.startsWith('tenant.created')) return 'bg-blue-100 text-blue-800'
    if (action.startsWith('tenant.deleted')) return 'bg-red-100 text-red-800'
    if (action.startsWith('tenant.suspended')) return 'bg-orange-100 text-orange-800'
    if (action.startsWith('tenant.activated')) return 'bg-green-100 text-green-800'
    if (action.startsWith('role.')) return 'bg-purple-100 text-purple-800'
    if (action.startsWith('payment.')) return 'bg-yellow-100 text-yellow-800'
    if (action.startsWith('invoice.')) return 'bg-yellow-100 text-yellow-800'
    if (action.startsWith('branch.')) return 'bg-indigo-100 text-indigo-800'
    if (action.startsWith('customer.')) return 'bg-pink-100 text-pink-800'
    if (action.startsWith('contact_')) return 'bg-pink-100 text-pink-800'
    if (action.startsWith('oauth.')) return 'bg-sky-100 text-sky-800'
    return 'bg-slate-100 text-slate-800'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
          <p className="mt-2 text-gray-600">
            {isPlatformAdmin ? 'All platform activity' : 'Activity for your tenant'}
          </p>
        </div>
        {stats && (
          <div className="flex gap-3">
            <div className="bg-white shadow rounded-lg px-4 py-2 text-center">
              <p className="text-xs text-gray-500">Total events</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="bg-white shadow rounded-lg px-4 py-2 text-center">
              <p className="text-xs text-gray-500">Last 30 days</p>
              <p className="text-2xl font-bold text-indigo-600">{stats.last30Days}</p>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Search action/resource/IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All actions</option>
            {actions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Resource type (e.g. user, tenant)"
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
          <input
            type="text"
            placeholder="User ID"
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            onClick={applyFilters}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resource</th>
              {isPlatformAdmin && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={isPlatformAdmin ? 6 : 5} className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={isPlatformAdmin ? 6 : 5} className="px-6 py-12 text-center text-gray-500">No audit logs found. (Login/logout events and admin actions will appear here.)</td></tr>
            ) : logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs font-semibold rounded-full ${actionColor(log.action)}`}>
                    {log.action}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 font-mono">
                  {log.resourceType || '-'}
                  {log.resourceId ? <span className="text-gray-500"> / {log.resourceId.slice(0, 8)}</span> : null}
                </td>
                {isPlatformAdmin && (
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {log.tenant ? (
                      <span>
                        {log.tenant.name}
                        <span className="text-xs text-gray-500 ml-1">({log.tenant.subdomain})</span>
                      </span>
                    ) : (
                      <span className="text-gray-400">platform</span>
                    )}
                  </td>
                )}
                <td className="px-6 py-4 text-sm text-gray-700">
                  {log.user ? `${log.user.firstName || ''} ${log.user.lastName || ''}`.trim() || log.user.email : (log.userId ? <span className="font-mono text-xs text-gray-500">{log.userId.slice(0, 8)}</span> : '-')}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 font-mono">{log.ipAddress || '-'}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{new Date(log.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200">
          <p className="text-sm text-gray-700">
            Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="px-3 py-1 bg-white border border-gray-300 rounded text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
              className="px-3 py-1 bg-white border border-gray-300 rounded text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Top actions summary */}
      {stats && stats.byAction.length > 0 && (
        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Top actions</h2>
          <div className="space-y-2">
            {stats.byAction.slice(0, 5).map((a) => (
              <div key={a.action} className="flex items-center gap-3">
                <span className={`px-2 py-0.5 text-xs rounded ${actionColor(a.action)}`}>{a.action}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-indigo-500"
                    style={{ width: `${(a._count / Math.max(...stats.byAction.map(x => x._count))) * 100}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600 w-12 text-right">{a._count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
