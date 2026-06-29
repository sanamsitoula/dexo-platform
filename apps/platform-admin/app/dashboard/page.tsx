'use client'

import { useEffect, useState } from 'react'
import { dashboardApi } from '@/lib/api'

interface DashboardStats {
  tenants: { total: number; active: number; trial: number }
  users: { total: number; averagePerTenant: number }
  subscriptions: { total: number; active: number; trial: number }
  revenue: { total: number; mrr: number }
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      const response = await dashboardApi.getStats()
      if (response.data) {
        setStats(response.data)
      } else if (response.error) {
        setError(response.error)
      }
      setLoading(false)
    }
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Platform Dashboard</h1>
        <p className="mt-2 text-gray-600">Platform statistics and overview</p>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
          <p className="text-red-500">Error loading dashboard: {error}</p>
        </div>
      </div>
    )
  }

  const statCards = [
    { name: 'Total Tenants', value: stats?.tenants?.total ?? 0, color: 'bg-blue-500' },
    { name: 'Total Users', value: stats?.users?.total ?? 0, color: 'bg-green-500' },
    { name: 'Active Subscriptions', value: stats?.subscriptions?.active ?? 0, color: 'bg-purple-500' },
    { name: 'Monthly Revenue', value: `$${((stats?.revenue?.mrr ?? 0) / 100).toFixed(2)}`, color: 'bg-yellow-500' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Platform Dashboard</h1>
        <p className="mt-2 text-gray-600">Platform statistics and overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div key={stat.name} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-md ${stat.color}`}>
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Tenant Status</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Active</span>
              <span className="font-medium text-green-600">{stats?.tenants?.active ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Trial</span>
              <span className="font-medium text-yellow-600">{stats?.tenants?.trial ?? 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <a href="/tenants/new" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md">
              Create New Tenant
            </a>
            <a href="/users/invite" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md">
              Invite User
            </a>
            <a href="/roles" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md">
              Manage Roles
            </a>
            <a href="/reports" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md">
              View Reports
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
