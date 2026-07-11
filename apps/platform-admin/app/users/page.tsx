'use client'

import { useEffect, useState } from 'react'
import { usersApi } from '@/lib/api'
import Pager from '@/components/Pager'

const PAGE_SIZE = 25

interface User {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  status: string
  createdAt: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  async function fetchUsers() {
    setLoading(true)
    const response = await usersApi.list({ page, limit: PAGE_SIZE })
    if (response.data) {
      const usersList = response.data.items ?? (Array.isArray(response.data) ? response.data : response.data.users || [])
      setUsers(usersList)
      setTotal(response.data.total ?? usersList.length)
    } else if (response.error) {
      setError(response.error)
    }
    setLoading(false)
  }

  async function handleDeactivate(userId: string) {
    if (!confirm('Are you sure you want to deactivate this user?')) return
    const response = await usersApi.deactivate(userId)
    if (response.data) {
      fetchUsers()
    } else if (response.error) {
      alert(response.error)
    }
  }

  async function handleReactivate(userId: string) {
    const response = await usersApi.reactivate(userId)
    if (response.data) {
      fetchUsers()
    } else if (response.error) {
      alert(response.error)
    }
  }

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      pending_verification: 'bg-yellow-100 text-yellow-800',
      locked: 'bg-red-100 text-red-800',
    }
    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.replace('_', ' ')}
      </span>
    )
  }

  function getInitials(user: User) {
    const first = user.firstName?.charAt(0) || ''
    const last = user.lastName?.charAt(0) || ''
    return `${first}${last}`.toUpperCase() || user.email.charAt(0).toUpperCase()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading users...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users</h1>
          <p className="mt-2 text-gray-600">Manage platform users</p>
        </div>
        <a
          href="/users/invite"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Invite User
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
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Joined
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  No users found. Invite your first user to get started.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                          <span className="text-sm font-medium text-white">{getInitials(user)}</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(user.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <a href={`/users/${user.id}`} className="text-blue-600 hover:text-blue-900">
                      View
                    </a>
                    {user.status === 'active' ? (
                      <button
                        onClick={() => handleDeactivate(user.id)}
                        className="text-yellow-600 hover:text-yellow-900"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReactivate(user.id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Reactivate
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
    </div>
  )
}