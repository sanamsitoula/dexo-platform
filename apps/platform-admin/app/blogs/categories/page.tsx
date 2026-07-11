'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { blogCategoryApi } from '@/lib/api'

const EMPTY = { name: '', description: '', color: '#6366f1', thumbnail: '' }

export default function BlogCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    fetchCategories()
  }, [])

  async function fetchCategories() {
    setLoading(true)
    const response = await blogCategoryApi.list()
    if (response.data) {
      setCategories(Array.isArray(response.data) ? response.data : [])
    }
    setLoading(false)
  }

  function startCreate() {
    setEditingId(null)
    setForm({ ...EMPTY })
    setShowForm(true)
    setError('')
  }

  function startEdit(cat: any) {
    setEditingId(cat.id)
    setForm({
      name: cat.name || '',
      description: cat.description || '',
      color: cat.color || '#6366f1',
      thumbnail: cat.thumbnail || '',
    })
    setShowForm(true)
    setError('')
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const data = {
      name: form.name,
      description: form.description || undefined,
      color: form.color || undefined,
      thumbnail: form.thumbnail || undefined,
    }
    const response = editingId
      ? await blogCategoryApi.update(editingId, data)
      : await blogCategoryApi.create(data)
    if (response.error) {
      setError(response.error)
    } else {
      setShowForm(false)
      fetchCategories()
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this category? Blogs in it will become uncategorized.')) return
    const response = await blogCategoryApi.delete(id)
    if (response.error) setError(response.error)
    else fetchCategories()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Blog Categories</h1>
          <p className="mt-2 text-gray-600">Organize blog posts into categories</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/blogs" className="btn-secondary">← Blogs</Link>
          <button onClick={startCreate} className="btn-primary">New Category</button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">{error}</div>
      )}

      {showForm && (
        <form onSubmit={handleSave} className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-medium text-gray-900">{editingId ? 'Edit Category' : 'New Category'}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="input-primary"
                placeholder="e.g. Product Updates"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="input-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail URL</label>
            <input
              type="url"
              value={form.thumbnail}
              onChange={(e) => setForm({ ...form, thumbnail: e.target.value })}
              className="input-primary"
              placeholder="https://example.com/thumb.jpg"
            />
            {form.thumbnail && (
              <img src={form.thumbnail} alt="Thumbnail preview" className="mt-2 h-24 w-40 object-cover rounded" />
            )}
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading categories...</div>
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">No categories yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div key={cat.id} className="bg-white rounded-lg shadow overflow-hidden">
              {cat.thumbnail ? (
                <img src={cat.thumbnail} alt={cat.name} className="h-32 w-full object-cover" />
              ) : (
                <div
                  className="h-32 w-full flex items-center justify-center text-4xl font-bold text-white"
                  style={{ background: `linear-gradient(135deg, ${cat.color || '#6366f1'}, #1e293b)` }}
                >
                  {(cat.name || '?').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: cat.color || '#6366f1' }} />
                  <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                </div>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{cat.description || 'No description'}</p>
                <p className="text-xs text-gray-400 mt-1">/{cat.slug}</p>
                <div className="mt-3 flex gap-3 text-sm">
                  <button onClick={() => startEdit(cat)} className="text-blue-600 hover:text-blue-900">Edit</button>
                  <button onClick={() => handleDelete(cat.id)} className="text-red-600 hover:text-red-900">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
