'use client'

import { useEffect, useState } from 'react'
import { tenantsApi, usersApi, rolesApi } from '@/lib/api'

export default function ReportsPage() {
  const [tenantCount, setTenantCount] = useState(0)
  const [userCount, setUserCount] = useState(0)
  const [roleCount, setRoleCount] = useState(0)
  const [tenantsByStatus, setTenantsByStatus] = useState<Record<string, number>>({})
  const [usersByStatus, setUsersByStatus] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchReportData() {
      setLoading(true)
      const [tenantsRes, usersRes, rolesRes] = await Promise.all([
        tenantsApi.list(),
        usersApi.list(),
        rolesApi.list(),
      ])

      if (tenantsRes.data) {
        const tenants = tenantsRes.data.data || []
        setTenantCount(tenantsRes.data.meta?.total || tenants.length)
        const byStatus: Record<string, number> = {}
        tenants.forEach((t: any) => {
          byStatus[t.status] = (byStatus[t.status] || 0) + 1
        })
        setTenantsByStatus(byStatus)
      }

      if (usersRes.data) {
        const users = usersRes.data.users || []
        setUserCount(users.length)
        const byStatus: Record<string, number> = {}
        users.forEach((u: any) => {
          byStatus[u.status] = (byStatus[u.status] || 0) + 1
        })
        setUsersByStatus(byStatus)
      }

      if (rolesRes.data) {
        setRoleCount((rolesRes.data || []).length)
      }

      setLoading(false)
    }
    fetchReportData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading reports...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <p className="mt-2 text-gray-600">Platform overview and analytics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900">Total Tenants</h3>
          <p className="mt-2 text-4xl font-bold text-blue-600">{tenantCount}</p>
          {Object.entries(tenantsByStatus).map(([status, count]) => (
            <p key={status} className="text-sm text-gray-500 mt-1">
              {status}: {count}
            </p>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900">Total Users</h3>
          <p className="mt-2 text-4xl font-bold text-green-600">{userCount}</p>
          {Object.entries(usersByStatus).map(([status, count]) => (
            <p key={status} className="text-sm text-gray-500 mt-1">
              {status.replace('_', ' ')}: {count}
            </p>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900">Total Roles</h3>
          <p className="mt-2 text-4xl font-bold text-purple-600">{roleCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Tenant Status Breakdown</h2>
        {Object.keys(tenantsByStatus).length === 0 ? (
          <p className="text-gray-500 text-sm">No tenant data available.</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(tenantsByStatus).map(([status, count]) => {
              const pct = tenantCount > 0 ? Math.round((count / tenantCount) * 100) : 0
              return (
                <div key={status}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700 capitalize">{status}</span>
                    <span className="text-gray-500">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">User Status Breakdown</h2>
        {Object.keys(usersByStatus).length === 0 ? (
          <p className="text-gray-500 text-sm">No user data available.</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(usersByStatus).map(([status, count]) => {
              const pct = userCount > 0 ? Math.round((count / userCount) * 100) : 0
              return (
                <div key={status}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700 capitalize">{status.replace('_', ' ')}</span>
                    <span className="text-gray-500">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
