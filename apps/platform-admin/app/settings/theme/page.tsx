'use client'

import { useState, useEffect } from 'react'
import { useTheme } from '@/components/ThemeProvider'
import { themeTemplates, ThemeConfig } from '@/lib/theme'

export default function ThemeSettingsPage() {
  const { theme, updateTheme, resetTheme } = useTheme()
  const [localTheme, setLocalTheme] = useState<ThemeConfig>(theme)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    setLocalTheme(theme)
  }, [theme])

  function handleColorChange(key: keyof ThemeConfig, value: string) {
    const updated = { ...localTheme, [key]: value }
    setLocalTheme(updated)
    updateTheme({ [key]: value })
  }

  function handleTemplateSelect(templateConfig: ThemeConfig) {
    setLocalTheme(templateConfig)
    updateTheme(templateConfig)
    setSuccess('Theme template applied!')
    setTimeout(() => setSuccess(''), 3000)
  }

  function handleReset() {
    resetTheme()
    setSuccess('Theme reset to defaults!')
    setTimeout(() => setSuccess(''), 3000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Theme Settings</h1>
        <p className="mt-2 text-gray-600">Customize the platform appearance</p>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
          {success}
        </div>
      )}

      {/* Theme Templates */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Theme Templates</h2>
        <p className="text-sm text-gray-600 mb-4">Choose a pre-designed theme or customize below</p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {themeTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => handleTemplateSelect(template.config)}
              className={`relative overflow-hidden rounded-lg border-2 transition-all ${
                localTheme.primaryColor === template.config.primaryColor
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div
                className="h-24 w-full"
                style={{ background: template.preview }}
              />
              <div className="p-3 text-left">
                <p className="text-sm font-medium text-gray-900">{template.name}</p>
                <p className="text-xs text-gray-500">{template.description}</p>
              </div>
              {localTheme.primaryColor === template.config.primaryColor && (
                <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Colors */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Custom Colors</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Primary Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={localTheme.primaryColor}
                onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                className="h-10 w-10 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={localTheme.primaryColor}
                onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                className="input-primary flex-1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Primary Hover Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={localTheme.primaryHoverColor}
                onChange={(e) => handleColorChange('primaryHoverColor', e.target.value)}
                className="h-10 w-10 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={localTheme.primaryHoverColor}
                onChange={(e) => handleColorChange('primaryHoverColor', e.target.value)}
                className="input-primary flex-1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Secondary Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={localTheme.secondaryColor}
                onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                className="h-10 w-10 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={localTheme.secondaryColor}
                onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                className="input-primary flex-1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Accent Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={localTheme.accentColor}
                onChange={(e) => handleColorChange('accentColor', e.target.value)}
                className="h-10 w-10 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={localTheme.accentColor}
                onChange={(e) => handleColorChange('accentColor', e.target.value)}
                className="input-primary flex-1"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Layout Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Layout Settings</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Border Radius
            </label>
            <select
              value={localTheme.borderRadius}
              onChange={(e) => handleColorChange('borderRadius', e.target.value)}
              className="input-primary"
            >
              <option value="0.25rem">Sharp (4px)</option>
              <option value="0.375rem">Slight (6px)</option>
              <option value="0.5rem">Medium (8px)</option>
              <option value="0.75rem">Rounded (12px)</option>
              <option value="1rem">Large (16px)</option>
              <option value="1.5rem">Extra Large (24px)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Font Family
            </label>
            <select
              value={localTheme.fontFamily}
              onChange={(e) => handleColorChange('fontFamily', e.target.value)}
              className="input-primary"
            >
              <option value="Inter, system-ui, sans-serif">Inter (Default)</option>
              <option value="system-ui, -apple-system, sans-serif">System UI</option>
              <option value="'Roboto', sans-serif">Roboto</option>
              <option value="'Open Sans', sans-serif">Open Sans</option>
              <option value="'Poppins', sans-serif">Poppins</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Dark Mode</label>
              <p className="text-sm text-gray-500">Enable dark theme</p>
            </div>
            <button
              onClick={() => handleColorChange('darkMode', (!localTheme.darkMode).toString() as any)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                localTheme.darkMode ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  localTheme.darkMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Preview</h2>
        
        <div className="space-y-4">
          <div className="flex gap-4">
            <button className="btn-primary">Primary Button</button>
            <button className="btn-secondary">Secondary Button</button>
          </div>
          
          <input
            type="text"
            placeholder="Input field preview"
            className="input-primary max-w-md"
          />
          
          <div className="card p-4">
            <p className="text-sm text-gray-900">Card component with current theme</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-4">
        <button onClick={handleReset} className="btn-secondary">
          Reset to Defaults
        </button>
      </div>
    </div>
  )
}
