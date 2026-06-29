'use client'

import { useEffect, useState } from 'react'
import { brandingApi } from '@/lib/api'

export default function BrandingSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [platformName, setPlatformName] = useState('Dexo')
  const [tagline, setTagline] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [logoDarkUrl, setLogoDarkUrl] = useState('')
  const [faviconUrl, setFaviconUrl] = useState('')
  const [supportEmail, setSupportEmail] = useState('')
  const [supportPhone, setSupportPhone] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [twitterUrl, setTwitterUrl] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [footerText, setFooterText] = useState('')
  const [privacyPolicyUrl, setPrivacyPolicyUrl] = useState('')
  const [termsOfServiceUrl, setTermsOfServiceUrl] = useState('')
  const [defaultMetaTitle, setDefaultMetaTitle] = useState('')
  const [defaultMetaDescription, setDefaultMetaDescription] = useState('')

  useEffect(() => {
    fetchBranding()
  }, [])

  async function fetchBranding() {
    setLoading(true)
    const response = await brandingApi.get()
    if (response.data) {
      const b = response.data
      setPlatformName(b.platformName || 'Dexo')
      setTagline(b.tagline || '')
      setLogoUrl(b.logoUrl || '')
      setLogoDarkUrl(b.logoDarkUrl || '')
      setFaviconUrl(b.faviconUrl || '')
      setSupportEmail(b.supportEmail || '')
      setSupportPhone(b.supportPhone || '')
      setWebsiteUrl(b.websiteUrl || '')
      setTwitterUrl(b.twitterUrl || '')
      setLinkedinUrl(b.linkedinUrl || '')
      setGithubUrl(b.githubUrl || '')
      setFooterText(b.footerText || '')
      setPrivacyPolicyUrl(b.privacyPolicyUrl || '')
      setTermsOfServiceUrl(b.termsOfServiceUrl || '')
      setDefaultMetaTitle(b.defaultMetaTitle || '')
      setDefaultMetaDescription(b.defaultMetaDescription || '')
    }
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    setSuccess('')

    const data = {
      platformName,
      tagline: tagline || undefined,
      logoUrl: logoUrl || undefined,
      logoDarkUrl: logoDarkUrl || undefined,
      faviconUrl: faviconUrl || undefined,
      supportEmail: supportEmail || undefined,
      supportPhone: supportPhone || undefined,
      websiteUrl: websiteUrl || undefined,
      twitterUrl: twitterUrl || undefined,
      linkedinUrl: linkedinUrl || undefined,
      githubUrl: githubUrl || undefined,
      footerText: footerText || undefined,
      privacyPolicyUrl: privacyPolicyUrl || undefined,
      termsOfServiceUrl: termsOfServiceUrl || undefined,
      defaultMetaTitle: defaultMetaTitle || undefined,
      defaultMetaDescription: defaultMetaDescription || undefined,
    }

    const response = await brandingApi.update(data)
    if (response.error) {
      setError(response.error)
    } else {
      setSuccess('Branding settings saved successfully!')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading branding settings...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Branding</h1>
          <p className="mt-2 text-gray-600">White-label your platform with custom branding</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">{success}</div>
      )}

      {/* Identity */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-lg font-medium text-gray-900">Platform Identity</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Platform Name</label>
            <input
              type="text"
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
              className="input-primary"
              placeholder="Dexo"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tagline</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="input-primary"
              placeholder="Multi-tenant SaaS Platform"
            />
          </div>
        </div>
      </div>

      {/* Logos */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-lg font-medium text-gray-900">Logos & Icons</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="input-primary"
              placeholder="https://example.com/logo.svg"
            />
            {logoUrl && (
              <div className="mt-2 p-4 bg-gray-50 rounded-lg flex items-center justify-center h-20">
                <img src={logoUrl} alt="Logo" className="max-h-16 object-contain" />
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dark Mode Logo URL</label>
            <input
              type="url"
              value={logoDarkUrl}
              onChange={(e) => setLogoDarkUrl(e.target.value)}
              className="input-primary"
              placeholder="https://example.com/logo-dark.svg"
            />
            {logoDarkUrl && (
              <div className="mt-2 p-4 bg-gray-800 rounded-lg flex items-center justify-center h-20">
                <img src={logoDarkUrl} alt="Dark Logo" className="max-h-16 object-contain" />
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Favicon URL</label>
            <input
              type="url"
              value={faviconUrl}
              onChange={(e) => setFaviconUrl(e.target.value)}
              className="input-primary"
              placeholder="https://example.com/favicon.ico"
            />
            {faviconUrl && (
              <div className="mt-2 p-4 bg-gray-50 rounded-lg flex items-center justify-center h-20">
                <img src={faviconUrl} alt="Favicon" className="max-h-12 object-contain" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-lg font-medium text-gray-900">Contact Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Support Email</label>
            <input
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              className="input-primary"
              placeholder="support@dexo.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Support Phone</label>
            <input
              type="text"
              value={supportPhone}
              onChange={(e) => setSupportPhone(e.target.value)}
              className="input-primary"
              placeholder="+1 234 567 8900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className="input-primary"
              placeholder="https://dexo.com"
            />
          </div>
        </div>
      </div>

      {/* Social */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-lg font-medium text-gray-900">Social Links</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Twitter / X</label>
            <input
              type="url"
              value={twitterUrl}
              onChange={(e) => setTwitterUrl(e.target.value)}
              className="input-primary"
              placeholder="https://twitter.com/dexo"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn</label>
            <input
              type="url"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              className="input-primary"
              placeholder="https://linkedin.com/company/dexo"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GitHub</label>
            <input
              type="url"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              className="input-primary"
              placeholder="https://github.com/dexo"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-lg font-medium text-gray-900">Footer & Legal</h2>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Footer Text</label>
          <input
            type="text"
            value={footerText}
            onChange={(e) => setFooterText(e.target.value)}
            className="input-primary"
            placeholder="© 2024 Dexo Platform. All rights reserved."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Privacy Policy URL</label>
            <input
              type="url"
              value={privacyPolicyUrl}
              onChange={(e) => setPrivacyPolicyUrl(e.target.value)}
              className="input-primary"
              placeholder="https://dexo.com/privacy"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Terms of Service URL</label>
            <input
              type="url"
              value={termsOfServiceUrl}
              onChange={(e) => setTermsOfServiceUrl(e.target.value)}
              className="input-primary"
              placeholder="https://dexo.com/terms"
            />
          </div>
        </div>
      </div>

      {/* SEO */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-lg font-medium text-gray-900">Default SEO</h2>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Default Meta Title</label>
          <input
            type="text"
            value={defaultMetaTitle}
            onChange={(e) => setDefaultMetaTitle(e.target.value)}
            className="input-primary"
            placeholder="Dexo - Multi-tenant SaaS Platform"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Default Meta Description</label>
          <textarea
            value={defaultMetaDescription}
            onChange={(e) => setDefaultMetaDescription(e.target.value)}
            rows={2}
            className="input-primary"
            placeholder="Dexo is a powerful multi-tenant SaaS platform..."
          />
        </div>
      </div>

      <div className="flex items-center justify-end">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : 'Save Branding Settings'}
        </button>
      </div>
    </div>
  )
}
