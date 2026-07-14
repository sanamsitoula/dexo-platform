'use client'

import { useEffect, useState } from 'react'
import { businessTemplatesApi } from '@/lib/api'

interface BusinessTemplate {
  id: string
  domainType: string
  name: string
  description: string
  tagline: string
  heroImage: string | null
  icon: string | null
  colorPrimary: string
  colorAccent: string
  colorBg: string
  fontHeading: string
  fontBody: string
  websiteSections: any
  onboardingSteps: any
  dashboardLayout: any
  features: any
  isActive: boolean
  sortOrder: number
}

type FormState = {
  id?: string
  domainType: string
  name: string
  tagline: string
  description: string
  heroImage: string
  icon: string
  colorPrimary: string
  colorAccent: string
  colorBg: string
  featuresJson: string
  isActive: boolean
}

const emptyForm: FormState = {
  domainType: '',
  name: '',
  tagline: '',
  description: '',
  heroImage: '',
  icon: '',
  colorPrimary: '#2D3748',
  colorAccent: '#4A5568',
  colorBg: '#F7FAFC',
  featuresJson: '{}',
  isActive: true,
}

export default function BusinessTemplatesPage() {
  const [templates, setTemplates] = useState<BusinessTemplate[]>([])
  const [availableDomainTypes, setAvailableDomainTypes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editing, setEditing] = useState<FormState | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [list, avail] = await Promise.all([
      businessTemplatesApi.listAdmin(),
      businessTemplatesApi.availableDomainTypes(),
    ])
    if (list.data) setTemplates(list.data)
    else if (list.error) setError(list.error)
    if (avail.data) setAvailableDomainTypes(avail.data)
    setLoading(false)
  }

  function openCreate() {
    setError('')
    setSuccess('')
    setEditing({ ...emptyForm, domainType: availableDomainTypes[0] || '' })
  }

  function openEdit(t: BusinessTemplate) {
    setError('')
    setSuccess('')
    setEditing({
      id: t.id,
      domainType: t.domainType,
      name: t.name,
      tagline: t.tagline,
      description: t.description,
      heroImage: t.heroImage || '',
      icon: t.icon || '',
      colorPrimary: t.colorPrimary,
      colorAccent: t.colorAccent,
      colorBg: t.colorBg,
      featuresJson: JSON.stringify(t.features ?? {}, null, 2),
      isActive: t.isActive,
    })
  }

  async function handleSave() {
    if (!editing) return
    let features: any
    try {
      features = JSON.parse(editing.featuresJson || '{}')
    } catch {
      setError('Features must be valid JSON, e.g. {"appointments": true}')
      return
    }
    setSaving(true)
    setError('')
    setSuccess('')

    const payload = {
      domainType: editing.domainType,
      name: editing.name,
      tagline: editing.tagline,
      description: editing.description,
      heroImage: editing.heroImage || null,
      icon: editing.icon || null,
      colorPrimary: editing.colorPrimary,
      colorAccent: editing.colorAccent,
      colorBg: editing.colorBg,
      features,
      isActive: editing.isActive,
    }

    const res = editing.id
      ? await businessTemplatesApi.update(editing.id, payload)
      : await businessTemplatesApi.create({
          ...payload,
          websiteSections: {},
          onboardingSteps: [],
          dashboardLayout: {},
        })

    if (res.error) setError(res.error)
    else {
      setSuccess(editing.id ? 'Template updated.' : 'Template created.')
      setEditing(null)
      load()
    }
    setSaving(false)
  }

  async function handleToggleActive(t: BusinessTemplate) {
    setError('')
    setSuccess('')
    const res = t.isActive ? await businessTemplatesApi.deactivate(t.id) : await businessTemplatesApi.reactivate(t.id)
    if (res.error) setError(res.error)
    else load()
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= templates.length) return
    const reordered = [...templates]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(target, 0, moved)
    setTemplates(reordered)
    const res = await businessTemplatesApi.reorder(reordered.map((t) => t.id))
    if (res.error) setError(res.error)
    else if (res.data) setTemplates(res.data)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-gray-500">Loading business templates...</div></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Business Templates</h1>
          <p className="mt-2 text-gray-600">
            The industry cards shown on step 1 of the tenant signup wizard ("What kind of business do you run?").
            Deactivating hides a card from signup without deleting its content — domainType is unique per
            {' '}<code>DomainType</code> enum value, so there's nothing else that could take its place.
          </p>
        </div>
        <button onClick={openCreate} disabled={availableDomainTypes.length === 0} className="btn-primary whitespace-nowrap">
          + New Template
        </button>
      </div>

      {availableDomainTypes.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md text-sm">
          All 12 <code>DomainType</code> enum values already have a template. Adding a wholly new industry vertical
          requires extending the Prisma <code>DomainType</code> enum first (a schema migration) — this UI can only
          create a template for a domain type that doesn't have one yet.
        </div>
      )}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">{success}</div>}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-500">
              <th className="py-2 px-4">Order</th>
              <th className="py-2 px-4">Color</th>
              <th className="py-2 px-4">Icon</th>
              <th className="py-2 px-4">Name</th>
              <th className="py-2 px-4">Domain Type</th>
              <th className="py-2 px-4">Tagline</th>
              <th className="py-2 px-4">Status</th>
              <th className="py-2 px-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {templates.map((t, i) => (
              <tr key={t.id} className={!t.isActive ? 'opacity-50' : ''}>
                <td className="py-2 px-4">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => handleMove(i, -1)} disabled={i === 0} className="text-xs text-gray-400 hover:text-gray-700 disabled:opacity-30">▲</button>
                    <button onClick={() => handleMove(i, 1)} disabled={i === templates.length - 1} className="text-xs text-gray-400 hover:text-gray-700 disabled:opacity-30">▼</button>
                  </div>
                </td>
                <td className="py-2 px-4">
                  <span className="inline-block h-5 w-5 rounded-full border border-gray-200" style={{ backgroundColor: t.colorPrimary }} title={t.colorPrimary} />
                </td>
                <td className="py-2 px-4 text-lg" title="Icon">{t.icon || '💼'}</td>
                <td className="py-2 px-4 font-medium text-gray-900">{t.name}</td>
                <td className="py-2 px-4 text-gray-500 font-mono text-xs">{t.domainType}</td>
                <td className="py-2 px-4 text-gray-500 truncate max-w-[260px]">{t.tagline}</td>
                <td className="py-2 px-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${t.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {t.isActive ? 'Active' : 'Hidden'}
                  </span>
                </td>
                <td className="py-2 px-4 text-right whitespace-nowrap">
                  <button onClick={() => openEdit(t)} className="text-indigo-600 hover:text-indigo-800 mr-3">Edit</button>
                  <button onClick={() => handleToggleActive(t)} className="text-gray-500 hover:text-gray-800">
                    {t.isActive ? 'Deactivate' : 'Reactivate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">{editing.id ? 'Edit Template' : 'New Template'}</h2>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Domain Type</label>
              {editing.id ? (
                <input value={editing.domainType} disabled className="input-primary bg-gray-50 font-mono text-xs" />
              ) : (
                <select
                  value={editing.domainType}
                  onChange={(e) => setEditing({ ...editing, domainType: e.target.value })}
                  className="input-primary"
                >
                  {availableDomainTypes.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Fixed to the Prisma <code>DomainType</code> enum — one template per value, can't be changed after creation.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="input-primary" placeholder="Fitness Center" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tagline</label>
              <input value={editing.tagline} onChange={(e) => setEditing({ ...editing, tagline: e.target.value })} className="input-primary" placeholder="Run your gym like a pro" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="input-primary" rows={3} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Icon (emoji, shown on the signup wizard card)</label>
              <input value={editing.icon} onChange={(e) => setEditing({ ...editing, icon: e.target.value })} className="input-primary" placeholder="🏋️" maxLength={8} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hero Image URL (optional)</label>
              <input value={editing.heroImage} onChange={(e) => setEditing({ ...editing, heroImage: e.target.value })} className="input-primary" placeholder="https://..." />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                <input type="color" value={editing.colorPrimary} onChange={(e) => setEditing({ ...editing, colorPrimary: e.target.value })} className="w-full h-10 rounded border border-gray-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Accent Color</label>
                <input type="color" value={editing.colorAccent} onChange={(e) => setEditing({ ...editing, colorAccent: e.target.value })} className="w-full h-10 rounded border border-gray-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Background Color</label>
                <input type="color" value={editing.colorBg} onChange={(e) => setEditing({ ...editing, colorBg: e.target.value })} className="w-full h-10 rounded border border-gray-300" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Feature Flags (JSON)</label>
              <textarea
                value={editing.featuresJson}
                onChange={(e) => setEditing({ ...editing, featuresJson: e.target.value })}
                className="input-primary font-mono text-xs"
                rows={4}
              />
              <p className="text-xs text-gray-400 mt-1">Drives which modules the tenant's dashboard enables by default, e.g. {'{"appointments": true, "pos": true}'}.</p>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={editing.isActive} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} />
              Active (shown on signup wizard)
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving || !editing.domainType} className="btn-primary">
                {saving ? 'Saving...' : editing.id ? 'Save Changes' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
