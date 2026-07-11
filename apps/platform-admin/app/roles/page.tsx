'use client'

import { useEffect, useState } from 'react'
import { rolesApi } from '@/lib/api'
import Pager from '@/components/Pager'
import PermissionMatrix from '@/components/PermissionMatrix'
import { expandPermissions } from '@/lib/permissions'

interface Role {
  id: string
  name: string
  description: string | null
  isSystem: boolean
  tenantId?: string | null
  permissions?: string[]
  createdAt: string
  _count?: { userRoles?: number }
}

const PAGE_SIZE = 20

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [detailRole, setDetailRole] = useState<Role | null>(null)

  useEffect(() => {
    fetchRoles(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  async function fetchRoles(p: number) {
    setLoading(true)
    const response = await rolesApi.list({ page: p, limit: PAGE_SIZE })
    if (response.data) {
      // Paginated shape: { items, total, page, limit }; fall back to plain array.
      if (Array.isArray(response.data)) {
        setRoles(response.data)
        setTotal(response.data.length)
      } else {
        setRoles(response.data.items || [])
        setTotal(response.data.total || 0)
      }
    } else if (response.error) {
      setError(response.error)
    }
    setLoading(false)
  }

  async function handleDelete(id: string, isSystem: boolean) {
    if (isSystem) {
      alert('System roles cannot be deleted')
      return
    }
    if (!confirm('Are you sure you want to delete this role?')) return
    const response = await rolesApi.delete(id)
    if (response.error) {
      alert(response.error)
    } else {
      fetchRoles(page)
    }
  }

  if (loading && roles.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading roles...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Roles</h1>
          <p className="mt-2 text-gray-600">Configure roles and permissions</p>
        </div>
        <a
          href="/roles/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Create Role
        </a>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Scope
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Permissions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {roles.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No roles found. Create your first role to get started.
                </td>
              </tr>
            ) : (
              roles.map((role) => (
                <tr key={role.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{role.name}</div>
                    {role.description && (
                      <div className="text-xs text-gray-500 max-w-xs truncate">{role.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {role.tenantId ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                        Tenant
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Platform
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {role.isSystem ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        System
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        Custom
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {(role.permissions || []).length}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(role.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                    <button
                      onClick={() => setDetailRole(role)}
                      title="View permission details"
                      className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-indigo-300 text-indigo-600 hover:bg-indigo-50 text-xs font-bold"
                    >
                      i
                    </button>
                    <a
                      href={`/roles/${role.id}`}
                      className="text-indigo-600 hover:text-indigo-900 font-semibold"
                    >
                      Edit
                    </a>
                    {!role.isSystem && (
                      <button
                        onClick={() => handleDelete(role.id, role.isSystem)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pager page={page} total={total} pageSize={PAGE_SIZE} onPage={setPage} />

      {/* Role details modal — permission matrix */}
      {detailRole && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setDetailRole(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{detailRole.name}</h2>
                <p className="text-sm text-gray-500">
                  {detailRole.description || 'No description'} ·{' '}
                  {detailRole.tenantId ? 'Tenant scope' : 'Platform scope'} ·{' '}
                  {detailRole.isSystem ? 'System role' : 'Custom role'}
                </p>
              </div>
              <button
                onClick={() => setDetailRole(null)}
                className="text-gray-400 hover:text-gray-700 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                Permission Matrix
              </h3>
              <PermissionMatrix cells={expandPermissions(detailRole.permissions || [])} />
              {(detailRole.permissions || []).length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Raw grants</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(detailRole.permissions || []).map((p) => (
                      <span
                        key={p}
                        className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-mono"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
