'use client'

import { useState } from 'react'

const TEMPLATES = [
  { key: 'standard', name: 'Standard', desc: 'Classic article layout with sidebar-width content', preview: ['w-2/3 h-2 bg-gray-300', 'w-full h-8 bg-gray-200', 'w-full h-1.5 bg-gray-300', 'w-5/6 h-1.5 bg-gray-300', 'w-4/6 h-1.5 bg-gray-300'] },
  { key: 'feature', name: 'Feature', desc: 'Full-width hero image with overlaid title', preview: ['w-full h-10 bg-indigo-200', 'w-1/2 h-2 bg-gray-300 mx-auto', 'w-full h-1.5 bg-gray-300', 'w-5/6 h-1.5 bg-gray-300'] },
  { key: 'minimal', name: 'Minimal', desc: 'Narrow centered column, typography-first', preview: ['w-1/2 h-2 bg-gray-300 mx-auto', 'w-2/3 h-1.5 bg-gray-300 mx-auto', 'w-2/3 h-1.5 bg-gray-300 mx-auto', 'w-1/2 h-1.5 bg-gray-300 mx-auto'] },
]

export function TemplatePicker({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Template</label>
      <div className="grid grid-cols-3 gap-3">
        {TEMPLATES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={`text-left border-2 rounded-lg p-3 transition ${value === t.key ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}
          >
            <div className="space-y-1 mb-2 bg-white border border-gray-100 rounded p-2">
              {t.preview.map((cls, i) => (
                <div key={i} className={`rounded-sm ${cls}`} />
              ))}
            </div>
            <div className="text-sm font-semibold text-gray-900">{t.name}</div>
            <div className="text-xs text-gray-500 mt-0.5">{t.desc}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

export function TagsInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState('')

  function addTag(raw: string) {
    const tag = raw.trim().replace(/,+$/, '')
    if (tag && !tags.includes(tag)) onChange([...tags, tag])
    setInput('')
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
      <div className="flex flex-wrap items-center gap-2 border border-gray-300 rounded-lg px-2 py-1.5 bg-white">
        {tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 text-xs font-medium px-2 py-1 rounded-full">
            {tag}
            <button type="button" onClick={() => onChange(tags.filter((t) => t !== tag))} className="hover:text-indigo-900">×</button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(input) }
            else if (e.key === 'Backspace' && !input && tags.length) onChange(tags.slice(0, -1))
          }}
          onBlur={() => input.trim() && addTag(input)}
          placeholder={tags.length ? '' : 'Type a tag and press Enter'}
          className="flex-1 min-w-[140px] text-sm py-1 px-1 outline-none"
        />
      </div>
      <p className="text-xs text-gray-400 mt-1">New tags are created automatically.</p>
    </div>
  )
}

export function SeoPanel({
  title, metaTitle, setMetaTitle, metaDescription, setMetaDescription, excerpt, slug, onSuggestSlug, suggesting,
}: {
  title: string
  metaTitle: string
  setMetaTitle: (v: string) => void
  metaDescription: string
  setMetaDescription: (v: string) => void
  excerpt: string
  slug: string
  onSuggestSlug: () => void
  suggesting: boolean
}) {
  const titleLen = (metaTitle || title).length
  const descLen = (metaDescription || excerpt).length
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">Meta Title</label>
          <span className={`text-xs ${titleLen > 60 ? 'text-red-500' : 'text-gray-400'}`}>{titleLen}/60</span>
        </div>
        <input
          type="text"
          value={metaTitle}
          onChange={(e) => setMetaTitle(e.target.value)}
          className="input-primary"
          placeholder="SEO title (defaults to blog title)"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">Meta Description</label>
          <span className={`text-xs ${descLen > 160 ? 'text-red-500' : 'text-gray-400'}`}>{descLen}/160</span>
        </div>
        <textarea
          value={metaDescription}
          onChange={(e) => setMetaDescription(e.target.value)}
          rows={2}
          className="input-primary"
          placeholder="SEO description (defaults to excerpt)"
        />
      </div>

      <div className="flex items-center gap-2">
        <button type="button" onClick={onSuggestSlug} disabled={suggesting || !title} className="btn-secondary text-sm">
          {suggesting ? 'Suggesting…' : '✨ AI Slug'}
        </button>
        {slug && <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">/{slug}</code>}
      </div>

      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Google snippet preview</p>
        <p className="text-blue-700 text-lg leading-snug truncate">{metaTitle || title || 'Blog title'}</p>
        <p className="text-green-700 text-sm">dexo.com/blog/{slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || '…'}</p>
        <p className="text-gray-600 text-sm line-clamp-2">{metaDescription || excerpt || 'No description provided — add a meta description to control how this appears in search results.'}</p>
      </div>
    </div>
  )
}

