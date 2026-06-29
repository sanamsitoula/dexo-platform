'use client'

import { useEffect, useState } from 'react'
import { notificationsApi } from '@/lib/api'

interface Template {
  id: string
  name: string
  type: string
  subject: string | null
  body: string
  variables: string[] | null
  isActive: boolean
  tenantId: string | null
}

export default function NotificationsPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newTemplate, setNewTemplate] = useState({ name: '', type: 'email', subject: '', body: '' })

  useEffect(() => { fetchTemplates() }, [])

  async function fetchTemplates() {
    setLoading(true)
    const response = await notificationsApi.listTemplates()
    if (response.data) {
      setTemplates(Array.isArray(response.data) ? response.data : [])
    } else if (response.error) {
      setError(response.error)
    }
    setLoading(false)
  }

  async function handleCreate() {
    const response = await notificationsApi.createTemplate(newTemplate)
    if (response.data) {
      setShowCreate(false)
      setNewTemplate({ name: '', type: 'email', subject: '', body: '' })
      fetchTemplates()
    } else if (response.error) {
      alert(response.error)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this template?')) return
    await notificationsApi.deleteTemplate(id)
    fetchTemplates()
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-gray-500">Loading notifications...</div></div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="mt-2 text-gray-600">Manage notification templates</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Create Template</button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">{error}</div>}

      {showCreate && (
        <div className="bg-white shadow rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-medium">New Template</h2>
          <input placeholder="Template name" value={newTemplate.name} onChange={e => setNewTemplate({...newTemplate, name: e.target.value})} className="w-full border rounded-md px-3 py-2" />
          <input placeholder="Subject" value={newTemplate.subject} onChange={e => setNewTemplate({...newTemplate, subject: e.target.value})} className="w-full border rounded-md px-3 py-2" />
          <textarea placeholder="Body (use {{variable}} for variables)" value={newTemplate.body} onChange={e => setNewTemplate({...newTemplate, body: e.target.value})} className="w-full border rounded-md px-3 py-2 h-32" />
          <div className="flex gap-2">
            <button onClick={handleCreate} className="bg-blue-600 text-white px-4 py-2 rounded-md">Create</button>
            <button onClick={() => setShowCreate(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {templates.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No templates found.</td></tr>
            ) : templates.map(t => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{t.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{t.type}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{t.subject || '-'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 inline-flex text-xs font-semibold rounded-full ${t.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {t.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium">
                  <button onClick={() => handleDelete(t.id)} className="text-red-600 hover:text-red-900">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
