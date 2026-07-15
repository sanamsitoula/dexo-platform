'use client'

import { useEffect, useMemo, useState } from 'react'
import { socialAuthApi } from '@/lib/api'

const API_HOST = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/api\/?$/, '')

const PROVIDERS = [
  { key: 'google', label: 'Google', scopeDefault: 'openid email profile' },
  { key: 'github', label: 'GitHub', scopeDefault: 'read:user user:email' },
  { key: 'facebook', label: 'Facebook', scopeDefault: 'email,public_profile' },
  { key: 'microsoft', label: 'Microsoft', scopeDefault: 'openid profile email User.Read' },
  { key: 'apple', label: 'Apple', scopeDefault: 'openid email name' },
  { key: 'linkedin', label: 'LinkedIn', scopeDefault: 'openid profile email' },
] as const

type ProviderKey = (typeof PROVIDERS)[number]['key']
type Check = { label: string; ok: boolean; detail?: string }

export default function PlatformOAuthSettingsPage() {
  const [provider, setProvider] = useState<ProviderKey>('google')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [redirectUri, setRedirectUri] = useState('')
  const [scope, setScope] = useState('')
  const [isEnabled, setIsEnabled] = useState(true)
  const [checks, setChecks] = useState<Check[] | null>(null)

  const expectedCallback = useMemo(() => `${API_HOST}/api/auth/platform/${provider}/callback`, [provider])
  const providerMeta = useMemo(() => PROVIDERS.find((p) => p.key === provider)!, [provider])

  useEffect(() => {
    load(provider)
  }, [provider])

  async function load(p: ProviderKey) {
    setLoading(true)
    setError('')
    setChecks(null)
    const res = await socialAuthApi.getPlatformConfigs()
    if (res.error) {
      setError(res.error)
    } else if (res.data) {
      const cfg = (res.data as any[]).find((c) => c.provider === p)
      setClientId(cfg?.clientId || '')
      setClientSecret('') // never echo the secret back — masked, blank = keep current
      setRedirectUri(cfg?.redirectUri || '')
      setScope(cfg?.scope || providerMeta.scopeDefault)
      setIsEnabled(cfg ? cfg.isEnabled !== false : true)
    }
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    setSuccess('')
    const payload: Record<string, any> = {
      clientId,
      redirectUri: redirectUri || expectedCallback,
      scope: scope || providerMeta.scopeDefault,
      isEnabled,
    }
    // Only send the secret when the admin typed a new one; an empty value
    // means "keep whatever is already stored" (the service upserts, and we
    // don't want to wipe a working secret with '').
    if (clientSecret) payload.clientSecret = clientSecret
    const res = await socialAuthApi.updatePlatformConfig(provider, payload)
    if (res.error) setError(res.error)
    else {
      setSuccess(`${providerMeta.label} config saved.`)
      setClientSecret('')
      load(provider)
    }
    setSaving(false)
  }

  async function handleTest() {
    setTesting(true)
    setError('')
    setSuccess('')
    setChecks(null)
    const res = await socialAuthApi.testPlatformConfig(provider)
    if (res.error) {
      setError(res.error)
    } else if (res.data) {
      setChecks(res.data.checks)
      if (res.data.ok) setSuccess(`${providerMeta.label} config looks good — try a real sign-in to confirm the secret.`)
    }
    setTesting(false)
  }

  async function copyRedirect() {
    try {
      await navigator.clipboard.writeText(expectedCallback)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setError('Clipboard unavailable — copy it manually.')
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-gray-500">Loading OAuth settings...</div></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Social Login (OAuth)</h1>
        <p className="mt-2 text-gray-600">
          The platform-wide OAuth keys every tenant falls back to. One redirect URI per provider serves
          <span className="font-medium text-gray-800"> all tenants</span> — the tenant a user is signing into is
          carried in the OAuth <code className="text-xs bg-gray-100 px-1 rounded">state</code>, so you never register
          a per-tenant URL. (A tenant can still add its own app under Tenants → a tenant → Social Login.)
        </p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">{success}</div>}

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-wrap gap-2 mb-6">
          {PROVIDERS.map((p) => (
            <button
              key={p.key}
              onClick={() => setProvider(p.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${
                provider === p.key ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Authorized redirect URI — paste this into the {providerMeta.label} console
          </label>
          <div className="flex items-stretch gap-2">
            <code className="flex-1 bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-800 break-all">
              {expectedCallback}
            </code>
            <button onClick={copyRedirect} className="btn-primary whitespace-nowrap">
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Under <span className="font-medium">Authorized redirect URIs</span> in the {providerMeta.label} console,
            add exactly this URL. It is the same for every tenant.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
            <input value={clientId} onChange={(e) => setClientId(e.target.value)} className="input-primary font-mono" placeholder={`${provider}-client-id.apps.googleusercontent.com`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client Secret</label>
            <input
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              className="input-primary font-mono"
              placeholder="********"
            />
            <p className="text-xs text-gray-400 mt-1">Masked after save — leave blank to keep the current secret, or paste a new one to rotate.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Redirect URI</label>
            <input
              value={redirectUri}
              onChange={(e) => setRedirectUri(e.target.value)}
              className="input-primary font-mono"
              placeholder={expectedCallback}
            />
            <p className="text-xs text-gray-400 mt-1">Usually identical to the authorized URI above.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scopes</label>
            <input value={scope} onChange={(e) => setScope(e.target.value)} className="input-primary" placeholder={providerMeta.scopeDefault} />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700 mt-4">
          <input type="checkbox" checked={isEnabled} onChange={(e) => setIsEnabled(e.target.checked)} />
          Enabled (uncheck to disable {providerMeta.label} sign-in platform-wide)
        </label>

        <div className="flex flex-wrap gap-2 mt-6">
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save Config'}
          </button>
          <button onClick={handleTest} disabled={testing} className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
        </div>
      </div>

      {checks && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-3">Connection Test</h2>
          <ul className="space-y-2">
            {checks.map((c) => (
              <li key={c.label} className="flex items-start gap-3 text-sm">
                <span className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs text-white ${c.ok ? 'bg-green-500' : 'bg-red-500'}`}>
                  {c.ok ? '✓' : '✕'}
                </span>
                <div>
                  <span className="font-medium text-gray-800">{c.label}</span>
                  {c.detail && <span className="text-gray-500"> — {c.detail}</span>}
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-400 mt-4">
            Note: this pre-flight validates fields, the redirect URI, and provider reachability. The client secret
            itself can only be confirmed during a real sign-in (OAuth has no &quot;verify secret&quot; call).
          </p>
        </div>
      )}
    </div>
  )
}
