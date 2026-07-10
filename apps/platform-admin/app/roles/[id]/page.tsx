'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { rolesApi, permissionsApi } from '@/lib/api'

interface Role {
  id: string
  name: string
  description: string | null
  isSystem: boolean
  isPlatform: boolean
  createdAt: string
  permissions: string[]
  _count?: { userRoles: number }
}

interface Permission {
  id: string
  resource: string
  action: string
  description?: string
}

export default function RoleDetailPage() {
  const id = useParams<{ id: string }>()?.id
  const router = useRouter()
  const [role, setRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [permissions, setPermissions] = useState<string[]>([])
  const [allPermissions, setAllPermissions] = useState<Permission[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [permissionDetails, setPermissionDetails] = useState<Permission[]>([])

  useEffect(() => {
    if (!id || id === 'new') return
    fetchRole(id)
    fetchAllPermissions()
  }, [id])

  async function fetchRole(id: string) {
    setLoading(true)
    const response = await rolesApi.getById(id)
    if (response.data) {
      setRole(response.data)
      setName(response.data.name)
      setDescription(response.data.description || '')
      setPermissions(response.data.permissions || [])
      setPermissionDetails(response.data.permissionDetails || [])
    }
    setLoading(false)
  }

  async function fetchAllPermissions() {
    const response = await permissionsApi.list().catch(() => ({ data: [] }))
    if (response.data) {
      const list = Array.isArray(response.data) ? response.data : (response.data as any).permissions || []
      setAllPermissions(list)
    }
  }

  async function handleSave() {
    if (!role) return
    setSaving(true)
    setError(null)
    setSuccess(null)

    const payload: any = { name, description }
    // Only send permissions if NOT a system role
    if (!role.isSystem) {
      payload.permissions = permissions
    }

    const response = await rolesApi.update(role.id, payload)
    if (response.data) {
      setRole({ ...role, name, description, permissions: response.data.permissions || permissions })
      setSuccess('Role updated successfully')
      setEditMode(false)
      setTimeout(() => setSuccess(null), 3000)
      // Re-fetch to get latest permission details
      fetchRole(role.id)
    } else if (response.error) {
      setError(response.error)
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!role) return
    if (!confirm(`Delete role "${role.name}"? This cannot be undone.`)) return
    const response = await rolesApi.delete(role.id)
    if (response.error) {
      alert(response.error)
    } else {
      router.push('/roles')
    }
  }

  function togglePermission(permId: string) {
    setPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    )
  }

  function toggleResourceGroup(resource: string, perms: Permission[]) {
    const allSelected = perms.every((p) => permissions.includes(p.id))
    if (allSelected) {
      setPermissions((prev) => prev.filter((p) => !perms.find((perm) => perm.id === p)))
    } else {
      const newPerms = perms.map((p) => p.id).filter((id) => !permissions.includes(id))
      setPermissions((prev) => [...prev, ...newPerms])
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading role…</div>
      </div>
    )
  }

  if (!role) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Role not found</p>
        <a href="/roles" className="text-indigo-600 hover:text-indigo-700 mt-2 inline-block">
          ← Back to roles
        </a>
      </div>
    )
  }

  // Group permissions by resource
  const permissionsByResource = allPermissions.reduce((acc, p) => {
    if (!acc[p.resource]) acc[p.resource] = []
    acc[p.resource].push(p)
    return acc
  }, {} as Record<string, Permission[]>)

  const groupedPermissions = Object.entries(permissionsByResource).map(([resource, perms]) => ({
    resource,
    perms,
  }))

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <a href="/roles" className="hover:text-indigo-600">Roles</a>
            <span>/</span>
            <span className="text-gray-700">{role.name}</span>
          </div>
          {editMode ? (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-3xl font-bold text-gray-900 w-full border-b-2 border-indigo-300 focus:border-indigo-600 focus:outline-none bg-transparent"
              placeholder="Role name"
            />
          ) : (
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              {role.name}
              {role.isSystem && (
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                  System
                </span>
              )}
            </h1>
          )}
          {editMode ? (
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-2 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Describe what this role can do…"
            />
          ) : (
            <p className="mt-2 text-gray-600">{role.description || 'No description'}</p>
          )}
        </div>
        <div className="flex gap-2 ml-4">
          {editMode ? (
            <>
              <button
                onClick={() => {
                  setEditMode(false)
                  setName(role.name)
                  setDescription(role.description || '')
                  setPermissions(role.permissions)
                  setError(null)
                }}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Saving…
                  </>
                ) : (
                  <>💾 Save Changes</>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditMode(true)}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 flex items-center gap-2"
              >
                ✏️ Edit Role
              </button>
              {!role.isSystem && (
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100"
                >
                  🗑️ Delete
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start">
          <span className="mr-2">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-start">
          <span className="mr-2">✓</span>
          <span>{success}</span>
        </div>
      )}

      {/* Info Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Role Information</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <dt className="text-xs text-gray-500 uppercase">Type</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {role.isSystem ? (
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                  System Role
                </span>
              ) : (
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                  Custom Role
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 uppercase">Users Assigned</dt>
            <dd className="mt-1 text-sm text-gray-900 font-semibold">
              {role._count?.userRoles ?? 0}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 uppercase">Permissions</dt>
            <dd className="mt-1 text-sm text-gray-900 font-semibold">
              {permissions.length} of {allPermissions.length}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 uppercase">Created</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(role.createdAt).toLocaleDateString()}
            </dd>
          </div>
        </dl>
        {role.isSystem && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
            <strong>System role:</strong> You can rename this role and update its description, but permissions are locked to prevent breaking platform access. Create a custom role to assign different permissions.
          </div>
        )}
      </div>

      {/* Permissions Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Permissions ({permissions.length} of {allPermissions.length})
          </h2>
          {!editMode && (
            <button
              onClick={() => setEditMode(true)}
              className="text-sm text-indigo-600 hover:text-indigo-700"
            >
              Edit
            </button>
          )}
        </div>

        {editMode && !role.isSystem ? (
          <div className="space-y-3">
            {groupedPermissions.map(({ resource, perms }) => {
              const allSelected = perms.every((p) => permissions.includes(p.id))
              return (
                <div key={resource} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-900 capitalize">{resource}</h3>
                    <button
                      type="button"
                      onClick={() => toggleResourceGroup(resource, perms)}
                      className="text-xs text-indigo-600 hover:text-indigo-700"
                    >
                      {allSelected ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {perms.map((p) => (
                      <label
                        key={p.id}
                        className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={permissions.includes(p.id)}
                          onChange={() => togglePermission(p.id)}
                          className="mt-0.5 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <div>
                          <div className="font-medium">{p.action}</div>
                          {p.description && (
                            <div className="text-xs text-gray-500">{p.description}</div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {permissionDetails.length === 0 ? (
              <p className="text-sm text-gray-500">No permissions assigned to this role.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {permissionDetails.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-start gap-2 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded text-sm"
                  >
                    <span className="text-indigo-600">✓</span>
                    <div>
                      <span className="font-medium text-gray-900 capitalize">
                        {p.resource}.{p.action}
                      </span>
                      {p.description && (
                        <div className="text-xs text-gray-500">{p.description}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {role.isSystem && (
              <p className="text-xs text-gray-500 italic mt-2">
                System role permissions are managed by the platform and cannot be modified.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Danger Zone (non-system only) */}
      {!role.isSystem && !editMode && (
        <div className="bg-white shadow rounded-lg p-6 border border-red-200">
          <h2 className="text-sm font-semibold text-red-700 uppercase tracking-wide mb-2">Danger Zone</h2>
          <p className="text-sm text-gray-600 mb-3">
            Deleting this role will remove it from all users. This action cannot be undone.
          </p>
          <button
            onClick={handleDelete}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700"
          >
            Delete this role
          </button>
        </div>
      )}
    </div>
  )
}
