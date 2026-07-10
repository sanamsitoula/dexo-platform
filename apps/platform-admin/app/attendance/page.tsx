'use client'

import { useEffect, useState } from 'react'
import { attendanceAdminApi } from '@/lib/api'

const badge = (s?: string | null) => {
  const map: Record<string, string> = {
    OK: 'bg-green-100 text-green-700', SUCCESS: 'bg-green-100 text-green-700',
    FAILED: 'bg-red-100 text-red-700', RUNNING: 'bg-amber-100 text-amber-700',
    NEVER: 'bg-gray-100 text-gray-500',
  }
  return `inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${map[s ?? 'NEVER'] ?? 'bg-gray-100 text-gray-500'}`
}

export default function PlatformAttendancePage() {
  const [devices, setDevices] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const [d, s] = await Promise.all([attendanceAdminApi.devices(), attendanceAdminApi.sessions()])
      if (d.error || s.error) setError(d.error || s.error || null)
      setDevices(Array.isArray(d.data) ? d.data : [])
      setSessions(Array.isArray(s.data) ? s.data : [])
      setLoading(false)
    })()
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Biometric Attendance</h1>
      <p className="text-sm text-gray-500 mt-1">ZKTeco devices and data-puller activity across every tenant.</p>
      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
      {loading ? (
        <div className="text-gray-400 mt-8">Loading…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <Kpi label="Devices" value={devices.length} />
            <Kpi label="Active" value={devices.filter((d) => d.isActive).length} />
            <Kpi label="Failing" value={devices.filter((d) => d.lastStatus === 'FAILED').length} />
            <Kpi label="Total punches" value={devices.reduce((s, d) => s + (d._count?.attendances ?? 0), 0)} />
          </div>

          <h2 className="font-semibold text-gray-900 dark:text-white mt-8 mb-3">Devices by tenant</h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100 dark:border-gray-700">
                  <th className="px-4 py-3">Tenant</th><th className="px-4 py-3">Device</th><th className="px-4 py-3">Address</th>
                  <th className="px-4 py-3">Punches</th><th className="px-4 py-3">Pulls</th><th className="px-4 py-3">Last pull</th><th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <tr key={d.id} className="border-b border-gray-50 dark:border-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{d.tenant?.name} <span className="text-gray-400 font-normal">({d.tenant?.subdomain})</span></td>
                    <td className="px-4 py-3">{d.name}{d.model ? ` · ${d.model}` : ''}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{d.ip}:{d.port}</td>
                    <td className="px-4 py-3">{d._count?.attendances ?? 0}</td>
                    <td className="px-4 py-3">{d._count?.pullSessions ?? 0}</td>
                    <td className="px-4 py-3 text-gray-500">{d.lastPullAt ? new Date(d.lastPullAt).toLocaleString() : 'never'}</td>
                    <td className="px-4 py-3"><span className={badge(d.lastStatus)}>{d.lastStatus ?? 'NEVER'}</span></td>
                  </tr>
                ))}
                {devices.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No devices registered by any tenant yet</td></tr>}
              </tbody>
            </table>
          </div>

          <h2 className="font-semibold text-gray-900 dark:text-white mt-8 mb-3">Recent pull sessions</h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100 dark:border-gray-700">
                  <th className="px-4 py-3">Started</th><th className="px-4 py-3">Tenant</th><th className="px-4 py-3">Device</th>
                  <th className="px-4 py-3">Status</th><th className="px-4 py-3">Pulled</th><th className="px-4 py-3">New</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-b border-gray-50 dark:border-gray-700/50">
                    <td className="px-4 py-3 text-gray-500">{new Date(s.startedAt).toLocaleString()}</td>
                    <td className="px-4 py-3">{s.tenant?.name}</td>
                    <td className="px-4 py-3">{s.device?.name}</td>
                    <td className="px-4 py-3"><span className={badge(s.status)}>{s.status}</span></td>
                    <td className="px-4 py-3">{s.recordsPulled}</td>
                    <td className="px-4 py-3">{s.newInserts}</td>
                  </tr>
                ))}
                {sessions.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No pull sessions yet</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="text-xs font-semibold text-gray-500 uppercase">{label}</div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</div>
    </div>
  )
}
