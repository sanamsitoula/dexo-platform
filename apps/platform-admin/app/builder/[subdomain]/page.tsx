'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const THEMES = [
  { code: 'fitness-pro', name: 'Fitness Pro', primary: '#FF6B35', secondary: '#1A1A2E' },
  { code: 'beauty-salon', name: 'Beauty Salon', primary: '#A855F7', secondary: '#581C87' },
  { code: 'edu-smart', name: 'Education', primary: '#2563EB', secondary: '#1E3A5F' },
  { code: 'coach-academy', name: 'Coaching', primary: '#059669', secondary: '#064E3B' },
  { code: 'foodie-hub', name: 'Restaurant', primary: '#DC2626', secondary: '#7C2D12' },
  { code: 'stay-hotel', name: 'Hotel', primary: '#B45309', secondary: '#78350F' },
  { code: 'medic-health', name: 'Healthcare', primary: '#0284C7', secondary: '#0C4A6E' },
  { code: 'shop-commerce', name: 'Ecommerce', primary: '#7C3AED', secondary: '#4C1D95' },
  { code: 'logi-track', name: 'Logistics', primary: '#0891B2', secondary: '#164E63' },
  { code: 'style-tailor', name: 'Tailor', primary: '#DB2777', secondary: '#831843' },
  { code: 'care-nonprofit', name: 'NGO', primary: '#10B981', secondary: '#064E3B' },
  { code: 'biz-corporate', name: 'SME', primary: '#64748B', secondary: '#334155' },
]

interface BuilderSettings {
  theme: string
  primaryColor: string
  logo: string
  favicon: string
  siteTitle: string
  hideDexoBranding: boolean
}

export default function WebsiteBuilderPage() {
  const subdomain = useParams<{ subdomain: string }>()?.subdomain
  const [tenant, setTenant] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'theme' | 'pages' | 'blog' | 'media' | 'seo' | 'branding'>('branding')
  const [settings, setSettings] = useState<BuilderSettings>({
    theme: 'biz-corporate',
    primaryColor: '#4f46e5',
    logo: '',
    favicon: '',
    siteTitle: '',
    hideDexoBranding: false,
  })
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!subdomain) return
    fetchTenant()
    loadSettings()
  }, [subdomain])

  function loadSettings() {
    const saved = localStorage.getItem(`tenant-theme-${subdomain}`)
    if (saved) {
      try {
        setSettings(JSON.parse(saved))
      } catch {}
    }
  }

  function saveSettings() {
    localStorage.setItem(`tenant-theme-${subdomain}`, JSON.stringify(settings))
    setSaveMessage('✓ Settings saved! Refresh the tenant app to see changes.')
    setTimeout(() => setSaveMessage(null), 3000)
  }

  function applyTheme(theme: typeof THEMES[0]) {
    setSettings({ ...settings, theme: theme.code, primaryColor: theme.primary })
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setSettings({ ...settings, logo: ev.target?.result as string })
    }
    reader.readAsDataURL(file)
  }

  function handleFaviconUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setSettings({ ...settings, favicon: ev.target?.result as string })
    }
    reader.readAsDataURL(file)
  }

  async function fetchTenant() {
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch(`${API_URL}/api/tenants/subdomain/${subdomain}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data && !data.error) setTenant(data)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading builder…</div>
  }

  if (!tenant) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Tenant not found</h1>
        <p className="text-gray-600">No tenant with subdomain "{subdomain}" was found.</p>
        <a href="/tenants" className="text-indigo-600 hover:text-indigo-700 mt-4 inline-block">
          ← Back to tenants
        </a>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Website & App Builder</h1>
            <p className="mt-1 text-sm text-gray-500">
              {tenant.name} · <span className="text-indigo-600">{subdomain}.dexo.app</span>
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href={`/t/${subdomain}/login`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 text-sm font-semibold"
            >
              🏪 Open Tenant App
            </a>
            <button
              onClick={saveSettings}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-semibold"
            >
              💾 Save Changes
            </button>
          </div>
        </div>
        {saveMessage && (
          <div className="mt-3 bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded text-sm">
            {saveMessage}
          </div>
        )}
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px overflow-x-auto">
            {[
              { key: 'branding', label: '🎨 Branding' },
              { key: 'theme', label: '🎭 Theme' },
              { key: 'pages', label: '📄 Pages' },
              { key: 'blog', label: '📝 Blog' },
              { key: 'media', label: '🖼️ Media' },
              { key: 'seo', label: '🔍 SEO' },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key as any)}
                className={`px-6 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === t.key
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'branding' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Logo</h3>
                <div className="flex items-center gap-4">
                  {settings.logo ? (
                    <img src={settings.logo} alt="Logo" className="h-16 border rounded p-2" />
                  ) : (
                    <div className="h-16 w-32 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 text-sm">
                      No logo
                    </div>
                  )}
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">PNG, SVG, or JPG. Transparent background recommended.</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Favicon</h3>
                <div className="flex items-center gap-4">
                  {settings.favicon ? (
                    <img src={settings.favicon} alt="Favicon" className="h-12 w-12 border rounded" />
                  ) : (
                    <div className="h-12 w-12 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 text-xs">
                      None
                    </div>
                  )}
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFaviconUpload}
                      className="text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">32x32 px ICO or PNG.</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Primary Color</h3>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.primaryColor}
                    onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                    className="h-10 w-20 rounded border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.primaryColor}
                    onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                    className="border border-gray-300 rounded-md px-3 py-2 font-mono"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">Used for buttons, links, and accents throughout the tenant app.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Site Title</h3>
                <input
                  type="text"
                  value={settings.siteTitle}
                  onChange={(e) => setSettings({ ...settings, siteTitle: e.target.value })}
                  placeholder={`${tenant.name} - Powered by Dexo`}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="hide-branding"
                  checked={settings.hideDexoBranding}
                  onChange={(e) => setSettings({ ...settings, hideDexoBranding: e.target.checked })}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                />
                <label htmlFor="hide-branding" className="text-sm text-gray-700">
                  <strong>Hide "Powered by Dexo"</strong> — full white-label (Whitelabel plan only)
                </label>
              </div>
            </div>
          )}

          {activeTab === 'theme' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Industry Theme</h2>
              <p className="text-sm text-gray-600">Pick a theme that matches your industry for pre-built colors and styling.</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {THEMES.map((theme) => (
                  <div
                    key={theme.code}
                    onClick={() => applyTheme(theme)}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      settings.theme === theme.code
                        ? 'border-indigo-500 ring-2 ring-indigo-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div
                      className="aspect-video rounded mb-2"
                      style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }}
                    ></div>
                    <p className="text-sm font-medium text-gray-900">{theme.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'pages' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Pages</h2>
                <button className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm font-medium">
                  + New Page
                </button>
              </div>
              <div className="space-y-2">
                {['Home', 'About', 'Services', 'Contact', 'Pricing'].map((page) => (
                  <div key={page} className="flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400">📄</span>
                      <div>
                        <p className="font-medium text-gray-900">{page}</p>
                        <p className="text-xs text-gray-500">/{page.toLowerCase()}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="text-sm text-indigo-600 hover:text-indigo-700">Edit</button>
                      <button className="text-sm text-gray-500 hover:text-gray-700">Preview</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'blog' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Blog Posts</h2>
                <button className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm font-medium">
                  + New Post
                </button>
              </div>
              <p className="text-sm text-gray-500 text-center py-8">
                No blog posts yet. Create your first post to start engaging customers.
              </p>
            </div>
          )}

          {activeTab === 'media' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Media Library</h2>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                <p className="text-gray-500 mb-2">📁 Drag & drop files here</p>
                <p className="text-xs text-gray-400">or click to browse (images, videos, documents)</p>
                <button className="mt-3 px-3 py-1.5 bg-indigo-600 text-white rounded text-sm font-medium">
                  Upload Files
                </button>
              </div>
            </div>
          )}

          {activeTab === 'seo' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">SEO Settings</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Site Title</label>
                <input
                  type="text"
                  defaultValue={settings.siteTitle || `${tenant.name} - Powered by Dexo`}
                  onChange={(e) => setSettings({ ...settings, siteTitle: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description</label>
                <textarea
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Describe your business in 155 characters…"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Keywords</label>
                <input
                  type="text"
                  placeholder="salon, beauty, spa, wellness"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
        <strong>💡 Tip:</strong> After saving changes, the tenant app at <code>/t/{subdomain}/login</code> will use your new logo, favicon, primary color, and white-label settings.
      </div>
    </div>
  )
}
