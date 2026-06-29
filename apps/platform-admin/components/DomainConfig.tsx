'use client'

import { useState } from 'react'

interface DomainConfigProps {
  tenant: any
  onSave: (settings: any) => Promise<void>
}

export function DomainConfig({ tenant, onSave }: DomainConfigProps) {
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const subdomain = tenant?.subdomain || ''
  const customDomain = tenant?.domain || ''

  const [newSubdomain, setNewSubdomain] = useState(subdomain)
  const [newCustomDomain, setNewCustomDomain] = useState(customDomain)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      await onSave({
        subdomain: newSubdomain || undefined,
        domain: newCustomDomain || undefined,
      })
      setMessage({ type: 'success', text: 'Domain settings saved successfully!' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save domain settings. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const platformDomain = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'dexo.com'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Success/Error Message */}
      {message && (
        <div
          className={`p-4 rounded-md ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Subdomain Configuration */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium mb-4">Subdomain Configuration</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subdomain
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newSubdomain}
                onChange={(e) => setNewSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="flex-1 px-3 py-2 border rounded-md text-sm"
                placeholder="fitness"
                pattern="[a-z0-9-]+"
                title="Only lowercase letters, numbers, and hyphens allowed"
              />
              <span className="text-gray-500 text-sm">.{platformDomain}</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Your tenant will be accessible at: <strong>{newSubdomain || 'your-subdomain'}.{platformDomain}</strong>
            </p>
          </div>

          {/* DNS Instructions for Subdomain */}
          {newSubdomain && newSubdomain !== subdomain && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-sm font-medium text-blue-800 mb-2">DNS Configuration Required</p>
              <p className="text-xs text-blue-700 mb-2">
                Add the following CNAME record to your DNS settings:
              </p>
              <code className="block bg-white p-2 rounded text-xs">
                {newSubdomain}.{platformDomain} IN CNAME {platformDomain}
              </code>
              <p className="text-xs text-blue-700 mt-2">
                Note: If you&apos;re using the platform&apos;s default domain, no DNS configuration is needed.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Custom Domain Configuration */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium mb-4">Custom Domain Configuration</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Domain (Optional)
            </label>
            <input
              type="text"
              value={newCustomDomain}
              onChange={(e) => setNewCustomDomain(e.target.value.toLowerCase())}
              className="w-full px-3 py-2 border rounded-md text-sm"
              placeholder="app.yourcompany.com"
            />
            <p className="mt-1 text-xs text-gray-500">
              Use your own domain for this tenant. Requires DNS configuration.
            </p>
          </div>

          {/* DNS Instructions for Custom Domain */}
          {newCustomDomain && newCustomDomain !== customDomain && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-sm font-medium text-blue-800 mb-2">DNS Configuration Required</p>
              <p className="text-xs text-blue-700 mb-2">
                Add one of the following records to your DNS settings:
              </p>
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-medium text-blue-700">Option 1: CNAME (Recommended)</p>
                  <code className="block bg-white p-2 rounded text-xs">
                    {newCustomDomain} IN CNAME {platformDomain}
                  </code>
                </div>
                <div>
                  <p className="text-xs font-medium text-blue-700">Option 2: A Record</p>
                  <code className="block bg-white p-2 rounded text-xs">
                    {newCustomDomain} IN A YOUR_SERVER_IP
                  </code>
                </div>
              </div>
            </div>
          )}

          {/* SSL Certificate Info */}
          {customDomain && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <p className="text-sm font-medium text-yellow-800 mb-1">SSL Certificate</p>
              <p className="text-xs text-yellow-700">
                SSL certificates are automatically provisioned for custom domains. This may take up to 24 hours after DNS propagation.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Current URLs */}
      {(subdomain || customDomain) && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium mb-4">Current URLs</h3>
          <div className="space-y-2">
            {subdomain && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div>
                  <p className="text-sm font-medium text-gray-700">Subdomain URL</p>
                  <a
                    href={`https://${subdomain}.${platformDomain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    https://{subdomain}.{platformDomain}
                  </a>
                </div>
                <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Active</span>
              </div>
            )}
            {customDomain && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div>
                  <p className="text-sm font-medium text-gray-700">Custom Domain URL</p>
                  <a
                    href={`https://${customDomain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    https://{customDomain}
                  </a>
                </div>
                <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Active</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Domain Settings'}
        </button>
      </div>
    </form>
  )
}
