'use client'

import { useState } from 'react'
import Image from 'next/image'

interface TenantBrandingConfigProps {
  tenant: any
  onSave: (settings: any) => Promise<void>
}

export function TenantBrandingConfig({ tenant, onSave }: TenantBrandingConfigProps) {
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Extract current settings or use defaults
  const settings = tenant?.settings || {}
  const branding = settings.branding || {}
  const analytics = settings.analytics || {}
  const whiteLabel = settings.whiteLabel || false

  // Form state
  const [primaryColor, setPrimaryColor] = useState(branding.primaryColor || '#0066FF')
  const [secondaryColor, setSecondaryColor] = useState(branding.secondaryColor || '#6B7280')
  const [accentColor, setAccentColor] = useState(branding.accentColor || '#10B981')
  const [logoUrl, setLogoUrl] = useState(branding.logo || '')
  const [faviconUrl, setFaviconUrl] = useState(branding.favicon || '')
  const [fontFamily, setFontFamily] = useState(branding.fontFamily || 'Inter, sans-serif')
  const [customCSS, setCustomCSS] = useState(branding.customCSS || '')
  const [gaMeasurementId, setGaMeasurementId] = useState(analytics.gaMeasurementId || '')
  const [gtmId, setGtmId] = useState(analytics.gtmId || '')
  const [fbPixelId, setFbPixelId] = useState(analytics.FacebookPixelId || '')
  const [isWhiteLabeled, setIsWhiteLabeled] = useState(whiteLabel)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const newSettings = {
        ...settings,
        branding: {
          primaryColor,
          secondaryColor,
          accentColor,
          logo: logoUrl || undefined,
          favicon: faviconUrl || undefined,
          fontFamily,
          customCSS: customCSS || undefined,
        },
        analytics: {
          gaMeasurementId: gaMeasurementId || undefined,
          gtmId: gtmId || undefined,
          FacebookPixelId: fbPixelId || undefined,
        },
        whiteLabel: isWhiteLabeled,
      }

      await onSave(newSettings)
      setMessage({ type: 'success', text: 'Branding settings saved successfully!' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

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

      {/* Branding Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium mb-4">Brand Colors & Style</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Primary Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-12 h-10 rounded border"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md text-sm"
                placeholder="#0066FF"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Secondary Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="w-12 h-10 rounded border"
              />
              <input
                type="text"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md text-sm"
                placeholder="#6B7280"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Accent Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-12 h-10 rounded border"
              />
              <input
                type="text"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md text-sm"
                placeholder="#10B981"
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="mt-4 p-4 border rounded-lg bg-gray-50">
          <p className="text-xs text-gray-500 mb-2">Preview:</p>
          <div className="flex gap-2">
            <button
              type="button"
              className="px-4 py-2 text-white rounded"
              style={{ backgroundColor: primaryColor }}
            >
              Primary Button
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded border-2"
              style={{
                borderColor: secondaryColor,
                color: secondaryColor,
              }}
            >
              Secondary Button
            </button>
            <span
              className="px-4 py-2 rounded text-white"
              style={{ backgroundColor: accentColor }}
            >
              Accent
            </span>
          </div>
        </div>
      </div>

      {/* Logo & Assets */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium mb-4">Logo & Assets</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Logo URL
            </label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
              placeholder="https://example.com/logo.png"
            />
            {logoUrl && (
              <div className="mt-2 p-2 border rounded bg-gray-50">
                <Image
                  src={logoUrl}
                  alt="Logo preview"
                  width={100}
                  height={40}
                  className="object-contain"
                  unoptimized
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Favicon URL
            </label>
            <input
              type="url"
              value={faviconUrl}
              onChange={(e) => setFaviconUrl(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
              placeholder="https://example.com/favicon.ico"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Font Family
            </label>
            <input
              type="text"
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
              placeholder="Inter, sans-serif"
            />
            <p className="mt-1 text-xs text-gray-500">
              Example: 'Inter, sans-serif' or 'Roboto, Arial, sans-serif'
            </p>
          </div>
        </div>
      </div>

      {/* Custom CSS */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium mb-4">Custom CSS</h3>
        <textarea
          value={customCSS}
          onChange={(e) => setCustomCSS(e.target.value)}
          rows={6}
          className="w-full px-3 py-2 border rounded-md text-sm font-mono"
          placeholder="/* Custom CSS rules */"
        />
        <p className="mt-1 text-xs text-gray-500">
          Add custom CSS that will be injected into the tenant's pages.
        </p>
      </div>

      {/* Analytics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium mb-4">Analytics & Tracking</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Google Analytics (GA4) Measurement ID
            </label>
            <input
              type="text"
              value={gaMeasurementId}
              onChange={(e) => setGaMeasurementId(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
              placeholder="G-XXXXXXXXXX"
            />
            <p className="mt-1 text-xs text-gray-500">
              Format: G-XXXXXXXXXX (GA4) or UA-XXXXXXXX-X (UA)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Google Tag Manager ID
            </label>
            <input
              type="text"
              value={gtmId}
              onChange={(e) => setGtmId(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
              placeholder="GTM-XXXXXX"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Facebook Pixel ID
            </label>
            <input
              type="text"
              value={fbPixelId}
              onChange={(e) => setFbPixelId(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
              placeholder="XXXXXXXXXXXXXXXX"
            />
          </div>
        </div>
      </div>

      {/* White-labeling */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">White-label Mode</h3>
            <p className="text-sm text-gray-500 mt-1">
              Hide Dexo Platform branding from this tenant
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isWhiteLabeled}
              onChange={(e) => setIsWhiteLabeled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Branding Settings'}
        </button>
      </div>
    </form>
  )
}
