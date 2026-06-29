'use client'

import { useEffect, useState } from 'react'
import { tenantsApi } from '@/lib/api'

interface DeletionImpact {
  tenant: { id: string; name: string; subdomain: string }
  totalRows: number
  activeSubscription: { id: string; status: string; plan?: { name: string } } | null
  blocked: boolean
  items: { model: string; count: number; detaches: boolean; label: string }[]
}

interface Props {
  tenantId: string | null
  tenantName: string
  onClose: () => void
  onDeleted: () => void
}

export default function DeleteTenantModal({ tenantId, tenantName, onClose, onDeleted }: Props) {
  const [impact, setImpact] = useState<DeletionImpact | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [step, setStep] = useState<'preview' | 'confirm' | 'deleting' | 'done'>('preview')

  useEffect(() => {
    if (!tenantId) return
    setStep('preview')
    setError(null)
    setConfirmText('')
    setLoading(true)
    tenantsApi
      .getDeletionImpact(tenantId)
      .then((r) => {
        if (r.error) setError(r.error)
        else if (r.data) setImpact(r.data as DeletionImpact)
      })
      .finally(() => setLoading(false))
  }, [tenantId])

  if (!tenantId) return null

  async function doDelete() {
    if (!tenantId) return
    setDeleting(true)
    setError(null)
    setStep('deleting')
    const r = await tenantsApi.delete(tenantId)
    setDeleting(false)
    if (r.error) {
      setError(r.error)
      setStep('preview')
    } else {
      setStep('done')
      setTimeout(() => {
        onDeleted()
        onClose()
      }, 1800)
    }
  }

  const nonZeroItems = impact?.items.filter((i) => i.count > 0) || []
  const totalDetach = impact?.items.filter((i) => i.detaches).reduce((s, i) => s + i.count, 0) || 0
  const totalDelete = nonZeroItems.filter((i) => !i.detaches).reduce((s, i) => s + i.count, 0)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-red-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <span className="text-2xl">🗑️</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-red-900">Delete tenant</h2>
              <p className="text-sm text-red-700">{tenantName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
            disabled={deleting}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-3"></div>
              Counting rows across 40+ tables…
            </div>
          )}

          {!loading && error && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md">
              <p className="font-semibold">⚠️ Error</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {!loading && !error && impact && step === 'preview' && (
            <div className="space-y-4">
              {impact.blocked && (
                <div className="bg-amber-50 border border-amber-300 text-amber-900 p-4 rounded-lg">
                  <p className="font-semibold">⚠️ Cannot delete — active subscription</p>
                  <p className="text-sm mt-1">
                    This tenant has an active <strong>{impact.activeSubscription?.plan?.name || 'subscription'}</strong>{' '}
                    (status: <code className="bg-amber-100 px-1 rounded">{impact.activeSubscription?.status}</code>).
                    Cancel it first before deleting the tenant.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs text-red-700 uppercase tracking-wider">Total rows to delete</p>
                  <p className="text-3xl font-bold text-red-900 mt-1">{totalDelete.toLocaleString()}</p>
                  <p className="text-xs text-red-600 mt-1">across {nonZeroItems.filter((i) => !i.detaches).length} tables</p>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-700 uppercase tracking-wider">Users detached</p>
                  <p className="text-3xl font-bold text-blue-900 mt-1">{totalDetach.toLocaleString()}</p>
                  <p className="text-xs text-blue-600 mt-1">tenantId will be cleared, users preserved</p>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Affected tables</p>
                  <p className="text-xs text-gray-500">{nonZeroItems.length} tables have data</p>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {nonZeroItems.length === 0 ? (
                    <p className="p-6 text-center text-gray-500 text-sm">No data in any related table.</p>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-100">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Table</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Rows</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {nonZeroItems
                          .sort((a, b) => b.count - a.count)
                          .map((item) => (
                            <tr key={item.model}>
                              <td className="px-4 py-2 text-sm">
                                <p className="font-medium text-gray-900">{item.label}</p>
                                <p className="text-xs text-gray-500 font-mono">{item.model}</p>
                              </td>
                              <td className="px-4 py-2 text-right text-sm font-mono font-semibold text-gray-900">
                                {item.count.toLocaleString()}
                              </td>
                              <td className="px-4 py-2 text-right">
                                {item.detaches ? (
                                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">Detach</span>
                                ) : (
                                  <span className="text-xs px-2 py-0.5 bg-red-100 text-red-800 rounded">Delete</span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-lg text-sm">
                <p className="font-semibold">⚠️ This cannot be undone</p>
                <p className="text-xs mt-1">
                  All data above will be permanently removed from the database. Make sure you have a backup
                  if needed. Users will be detached (preserved) but their <code>tenantId</code> will be cleared.
                </p>
              </div>
            </div>
          )}

          {!loading && !error && impact && step === 'confirm' && (
            <div className="space-y-4">
              <div className="bg-red-50 border-2 border-red-300 p-5 rounded-lg">
                <p className="text-red-900 font-bold text-lg">Final confirmation</p>
                <p className="text-sm text-red-800 mt-2">
                  You are about to permanently delete:
                </p>
                <ul className="text-sm text-red-800 mt-2 space-y-1 list-disc list-inside">
                  <li>Tenant <strong>{impact.tenant.name}</strong> (subdomain <code>{impact.tenant.subdomain}</code>)</li>
                  <li><strong>{totalDelete.toLocaleString()}</strong> rows across {nonZeroItems.filter((i) => !i.detaches).length} tables</li>
                  <li><strong>{totalDetach.toLocaleString()}</strong> users will lose their tenant link</li>
                </ul>
                <div className="mt-4">
                  <label className="block text-sm font-semibold text-red-900 mb-1">
                    Type the tenant subdomain <code className="bg-white px-1 rounded text-red-700">{impact.tenant.subdomain}</code> to confirm:
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    className="block w-full border-2 border-red-300 rounded-md px-3 py-2 font-mono text-sm"
                    placeholder={impact.tenant.subdomain}
                    autoFocus
                  />
                </div>
              </div>
            </div>
          )}

          {step === 'deleting' && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-700">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mb-4"></div>
              <p className="text-lg font-semibold">Deleting tenant and all related data…</p>
              <p className="text-sm text-gray-500 mt-1">This may take a few seconds.</p>
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-12 text-green-700">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <span className="text-3xl">✅</span>
              </div>
              <p className="text-lg font-bold">Tenant deleted</p>
              <p className="text-sm text-gray-500 mt-1">All associated data has been removed.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          {step === 'preview' && (
            <>
              <button
                onClick={onClose}
                className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep('confirm')}
                disabled={impact?.blocked || !impact || loading}
                className="px-6 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {impact?.blocked ? 'Cannot delete' : `Proceed to delete (${totalDelete.toLocaleString()} rows)`}
              </button>
            </>
          )}

          {step === 'confirm' && (
            <>
              <button
                onClick={() => setStep('preview')}
                className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={deleting}
              >
                ← Back
              </button>
              <button
                onClick={doDelete}
                disabled={deleting || confirmText !== impact?.tenant.subdomain}
                className="px-6 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🗑️ Permanently delete
              </button>
            </>
          )}

          {(step === 'deleting' || step === 'done') && (
            <button
              onClick={onClose}
              disabled={step === 'deleting'}
              className="ml-auto px-5 py-2 text-sm font-medium text-white bg-gray-700 rounded-md hover:bg-gray-800 disabled:opacity-50"
            >
              {step === 'done' ? 'Close' : 'Working…'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
