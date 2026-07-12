'use client'

import { useEffect, useState } from 'react'
import { moduleOverridesApi } from '@/lib/api'

interface TenantModulesConfigProps {
  tenantId: string
}

interface Override {
  id: string
  tenantId: string
  moduleKey: string
  enabled: boolean
  reason: string | null
  setBy: string | null
}

// Known module keys — matches HREF_MODULE_MAP in apps/tenant-admin/components/ModuleNav.tsx.
const MODULE_KEYS: { key: string; label: string }[] = [
  { key: 'ecommerce', label: 'Ecommerce' },
  { key: 'crm', label: 'CRM' },
  { key: 'blog', label: 'Blog' },
  { key: 'billing_invoice', label: 'Billing / Invoicing' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'website_builder', label: 'Website Builder' },
  { key: 'announcements', label: 'Announcements' },
]

export function TenantModulesConfig({ tenantId }: TenantModulesConfigProps) {
  const [overrides, setOverrides] = useState<Override[]>([])
  const [loading, setLoading] = useState(true)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function load() {
    setLoading(true)
    const res = await moduleOverridesApi.list(tenantId)
    if (res.data) setOverrides(res.data)
    setLoading(false)
  }

  useEffect(() => {
    if (tenantId) load()
  }, [tenantId])

  const overrideFor = (moduleKey: string) => overrides.find((o) => o.moduleKey === moduleKey)

  async function toggle(moduleKey: string, nextEnabled: boolean) {
    setBusyKey(moduleKey)
    setMessage(null)
    try {
      const reason = prompt(`Reason for ${nextEnabled ? 'granting' : 'restricting'} "${moduleKey}"? (optional)`) || undefined
      const res = await moduleOverridesApi.set(tenantId, moduleKey, nextEnabled, reason)
      if (res.error) throw new Error(res.error)
      setMessage({ type: 'success', text: `Module "${moduleKey}" ${nextEnabled ? 'granted' : 'restricted'}.` })
      await load()
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message || 'Failed to update module override' })
    } finally {
      setBusyKey(null)
    }
  }

  async function clearOverride(moduleKey: string) {
    setBusyKey(moduleKey)
    setMessage(null)
    try {
      const res = await moduleOverridesApi.remove(tenantId, moduleKey)
      if (res.error) throw new Error(res.error)
      setMessage({ type: 'success', text: `Override for "${moduleKey}" removed — reverted to plan default.` })
      await load()
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message || 'Failed to remove override' })
    } finally {
      setBusyKey(null)
    }
  }

  if (loading) return <div className="text-gray-500 text-sm">Loading modules...</div>

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-medium">Module Access</h3>
          <p className="text-sm text-gray-500 mt-1">
            Grant or restrict individual modules for this tenant, overriding their subscription plan's defaults.
          </p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-6 py-3">Module</th>
              <th className="px-6 py-3">Current State</th>
              <th className="px-6 py-3">Reason</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {MODULE_KEYS.map(({ key, label }) => {
              const override = overrideFor(key)
              const busy = busyKey === key
              return (
                <tr key={key} className="border-t border-gray-100">
                  <td className="px-6 py-3 font-medium">{label}</td>
                  <td className="px-6 py-3">
                    {override ? (
                      <span className={`px-2 py-0.5 rounded text-xs ${override.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {override.enabled ? 'Granted (override)' : 'Restricted (override)'}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">Using plan default</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-xs text-gray-500">{override?.reason || '—'}</td>
                  <td className="px-6 py-3">
                    <div className="flex gap-2">
                      <button
                        disabled={busy || (override?.enabled === true)}
                        onClick={() => toggle(key, true)}
                        className="px-3 py-1 bg-emerald-600 text-white rounded-md text-xs disabled:opacity-50"
                      >
                        Grant
                      </button>
                      <button
                        disabled={busy || (override?.enabled === false)}
                        onClick={() => toggle(key, false)}
                        className="px-3 py-1 bg-red-600 text-white rounded-md text-xs disabled:opacity-50"
                      >
                        Restrict
                      </button>
                      {override && (
                        <button
                          disabled={busy}
                          onClick={() => clearOverride(key)}
                          className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-xs disabled:opacity-50"
                        >
                          Clear override
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
