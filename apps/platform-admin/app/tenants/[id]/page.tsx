'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { tenantsApi, usersApi, subscriptionsApi } from '@/lib/api'
import { TenantBrandingConfig } from '@/components/TenantBrandingConfig'
import { DomainConfig } from '@/components/DomainConfig'

export default function TenantDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const [tenant, setTenant] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [subscription, setSubscription] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'branding' | 'analytics' | 'domains'>('overview')

  useEffect(() => {
    if (!id) return
    fetchData()
  }, [id])

  async function fetchData() {
    setLoading(true)
    const [tenantRes, subRes] = await Promise.all([
      tenantsApi.getById(id as string),
      subscriptionsApi.getTenantSubscription(id as string),
    ])
    if (tenantRes.data) setTenant(tenantRes.data)
    if (subRes.data) setSubscription(subRes.data)
    setLoading(false)
  }

  async function handleSuspend() {
    if (!confirm('Suspend this tenant?')) return
    await tenantsApi.suspend(id as string)
    fetchData()
  }

  async function handleActivate() {
    await tenantsApi.activate(id as string)
    fetchData()
  }

  async function handleDelete() {
    if (!confirm('Permanently delete this tenant?')) return
    await tenantsApi.delete(id as string)
    router.push('/tenants')
  }

  async function handleSaveSettings(settings: any) {
    await tenantsApi.updateSettings(id as string, settings)
    await fetchData()
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-gray-500">Loading tenant...</div></div>
  if (!tenant) return <div className="text-center py-12 text-gray-500">Tenant not found</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{tenant.name}</h1>
          <p className="mt-2 text-gray-600">{tenant.subdomain || 'No subdomain'}</p>
        </div>
        <div className="flex gap-2">
          {tenant.status === 'active' ? (
            <button onClick={handleSuspend} className="bg-yellow-600 text-white px-4 py-2 rounded-md">Suspend</button>
          ) : (
            <button onClick={handleActivate} className="bg-green-600 text-white px-4 py-2 rounded-md">Activate</button>
          )}
          <button onClick={handleDelete} className="bg-red-600 text-white px-4 py-2 rounded-md">Delete</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('branding')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'branding'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Branding & Analytics
          </button>
          <button
            onClick={() => setActiveTab('domains')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'domains'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Domains
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">Status</p>
              <p className="mt-1 text-lg font-semibold capitalize">{tenant.status}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">Created</p>
              <p className="mt-1 text-lg font-semibold">{new Date(tenant.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">Subscription</p>
              <p className="mt-1 text-lg font-semibold">{subscription?.plan?.name || 'None'}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium mb-4">Tenant Settings</h2>
            <pre className="text-sm text-gray-600 bg-gray-50 p-4 rounded overflow-auto">{JSON.stringify(tenant.settings, null, 2)}</pre>
          </div>
        </>
      )}

      {activeTab === 'branding' && (
        <TenantBrandingConfig tenant={tenant} onSave={handleSaveSettings} />
      )}

      {activeTab === 'domains' && (
        <DomainConfig tenant={tenant} onSave={handleSaveSettings} />
      )}
    </div>
  )
}
