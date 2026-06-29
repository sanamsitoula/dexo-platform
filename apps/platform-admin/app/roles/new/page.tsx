'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { rolesApi } from '@/lib/api'

export default function NewRolePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const res = await rolesApi.create({ name, description })
    if (res.error) {
      setError(res.error)
      setSaving(false)
    } else {
      router.push('/roles')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <a href="/roles" className="text-sm text-indigo-600 hover:text-indigo-700">← Back to Roles</a>
        <h1 className="text-3xl font-bold text-gray-900 mt-2">Create New Role</h1>
        <p className="mt-2 text-gray-600">Define a custom role with specific permissions</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">⚠️ {error}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="e.g., Salon Manager"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="What can this role do?"
          />
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={() => router.push('/roles')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="px-6 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Creating…' : '+ Create Role'}
          </button>
        </div>
      </form>
    </div>
  )
}
