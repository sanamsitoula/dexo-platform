'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usersApi, rolesApi } from '@/lib/api'

export default function InviteUserPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [roleId, setRoleId] = useState('')
  const [roles, setRoles] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function fetchRoles() {
      const response = await rolesApi.list()
      if (response.data) {
        setRoles(Array.isArray(response.data) ? response.data : ((response.data as any).roles || []))
      }
    }
    fetchRoles()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const response = await usersApi.invite({ email, roleId: roleId || undefined })
    if (response.data) {
      setSuccess(true)
    } else if (response.error) {
      setError(response.error)
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Invited</h1>
          <p className="mt-2 text-gray-600">Invitation sent to {email}</p>
        </div>
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
          Invitation email sent successfully. The user will receive a link to set up their account.
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => {
              setEmail('')
              setRoleId('')
              setSuccess(false)
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Invite Another
          </button>
          <button
            onClick={() => router.push('/users')}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
          >
            Back to Users
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Invite User</h1>
        <p className="mt-2 text-gray-600">Send an invitation to a new user</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email Address *</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="user@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Role (Optional)</label>
          <select
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">No role assigned</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex space-x-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Sending Invitation...' : 'Send Invitation'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/users')}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
