'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { usersApi, rolesApi } from '@/lib/api'

export default function UserDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [roles, setRoles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    fetchData()
  }, [id])

  async function fetchData() {
    setLoading(true)
    const [userRes, rolesRes] = await Promise.all([
      usersApi.getById(id as string),
      rolesApi.list(),
    ])
    if (userRes.data) setUser(userRes.data)
    if (rolesRes.data) setRoles(Array.isArray(rolesRes.data) ? rolesRes.data : [])
    setLoading(false)
  }

  async function handleDeactivate() {
    if (!confirm('Deactivate this user?')) return
    await usersApi.deactivate(id as string)
    fetchData()
  }

  async function handleReactivate() {
    await usersApi.reactivate(id as string)
    fetchData()
  }

  async function handleAssignRole(roleId: string) {
    await rolesApi.assign({ userId: id as string, roleId })
    fetchData()
  }

  async function handleRemoveRole(roleId: string) {
    await rolesApi.remove({ userId: id as string, roleId })
    fetchData()
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-gray-500">Loading user...</div></div>
  if (!user) return <div className="text-center py-12 text-gray-500">User not found</div>

  const userRoles = user.userRoles?.map((ur: any) => ur.role) || []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-blue-500 flex items-center justify-center">
            <span className="text-xl font-bold text-white">{user.firstName?.charAt(0) || user.email?.charAt(0)}</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{user.firstName} {user.lastName}</h1>
            <p className="text-gray-600">{user.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {user.status === 'active' ? (
            <button onClick={handleDeactivate} className="bg-yellow-600 text-white px-4 py-2 rounded-md">Deactivate</button>
          ) : (
            <button onClick={handleReactivate} className="bg-green-600 text-white px-4 py-2 rounded-md">Reactivate</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Status</p>
          <p className="mt-1 text-lg font-semibold capitalize">{user.status?.replace('_', ' ')}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Email Verified</p>
          <p className="mt-1 text-lg font-semibold">{user.emailVerified ? 'Yes' : 'No'}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Platform Admin</p>
          <p className="mt-1 text-lg font-semibold">{user.isPlatformAdmin ? 'Yes' : 'No'}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Joined</p>
          <p className="mt-1 text-lg font-semibold">{new Date(user.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4">Assigned Roles</h2>
        {userRoles.length === 0 ? (
          <p className="text-gray-500 text-sm">No roles assigned</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {userRoles.map((role: any) => (
              <span key={role.id} className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                {role.name}
                <button onClick={() => handleRemoveRole(role.id)} className="text-blue-600 hover:text-blue-900 ml-1">&times;</button>
              </span>
            ))}
          </div>
        )}
        <div className="mt-4">
          <select onChange={e => { if (e.target.value) handleAssignRole(e.target.value); e.target.value = '' }} className="border rounded-md px-3 py-2 text-sm">
            <option value="">Add a role...</option>
            {roles.filter(r => !userRoles.find((ur: any) => ur.id === r.id)).map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
