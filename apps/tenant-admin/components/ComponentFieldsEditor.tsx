'use client'

import { useEffect, useState } from 'react'
import type { ComponentDef, ComponentFieldDef, ListItemFieldDef } from '@dexo/shared/src/page-builder'
import RichTextEditor from './RichTextEditor'
import MediaPicker, { permanentMediaUrl } from './MediaPicker'
import { formsBuilderApi } from '@/lib/api'

/**
 * Generic property-panel renderer — one field-type switch drives every
 * Component Library entry's edit form, so adding a new component type
 * (packages/shared/src/page-builder/components.ts) never requires a new
 * form component here.
 */
export default function ComponentFieldsEditor({
  subdomain,
  def,
  content,
  onChange,
}: {
  subdomain: string
  def: ComponentDef
  content: Record<string, any>
  onChange: (next: Record<string, any>) => void
}) {
  function setField(key: string, value: any) {
    onChange({ ...content, [key]: value })
  }

  return (
    <div className="space-y-4">
      {def.fields.map((field) => (
        <FieldEditor
          key={field.key}
          subdomain={subdomain}
          field={field}
          value={content[field.key]}
          onChange={(v) => setField(field.key, v)}
        />
      ))}
    </div>
  )
}

function FieldEditor({
  subdomain,
  field,
  value,
  onChange,
}: {
  subdomain: string
  field: ComponentFieldDef
  value: any
  onChange: (v: any) => void
}) {
  const [pickerOpen, setPickerOpen] = useState(false)

  if (field.type === 'text') {
    return (
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">{field.label}</label>
        <input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
    )
  }

  if (field.type === 'url') {
    return (
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">{field.label}</label>
        <input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || 'https://…'}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
    )
  }

  if (field.type === 'textarea') {
    return (
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">{field.label}</label>
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder={field.placeholder}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
    )
  }

  if (field.type === 'richtext') {
    return (
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">{field.label}</label>
        <RichTextEditor value={value || ''} onChange={onChange} minHeight={180} />
      </div>
    )
  }

  if (field.type === 'image') {
    return (
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">{field.label}</label>
        <div className="flex items-center gap-3">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-gray-50 border border-dashed border-gray-300 flex items-center justify-center text-xl">🖼️</div>
          )}
          <div className="flex flex-col gap-1">
            <button type="button" onClick={() => setPickerOpen(true)} className="text-xs text-indigo-600 hover:underline text-left">Choose from Media Library</button>
            {value && <button type="button" onClick={() => onChange('')} className="text-xs text-red-600 hover:underline text-left">Remove</button>}
          </div>
        </div>
        <MediaPicker
          subdomain={subdomain}
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={(file) => { onChange(permanentMediaUrl(file.id)); setPickerOpen(false) }}
        />
      </div>
    )
  }

  if (field.type === 'form-select') {
    const [forms, setForms] = useState<any[]>([])
    useEffect(() => {
      formsBuilderApi.list(subdomain).then((r) => setForms(Array.isArray(r.data) ? r.data : []))
    }, [subdomain])
    return (
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">{field.label}</label>
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Select a form…</option>
          {forms.map((f) => (
            <option key={f.id} value={f.id}>{f.name} {f.status !== 'published' ? '(draft — publish it first)' : ''}</option>
          ))}
        </select>
        {forms.length === 0 && <p className="text-xs text-gray-400 mt-1">No forms yet — create one under Website → Forms first.</p>}
      </div>
    )
  }

  if (field.type === 'list') {
    const items: any[] = Array.isArray(value) ? value : []
    const itemFields = field.itemFields || []

    const updateItem = (i: number, key: string, v: any) => {
      const next = items.slice()
      next[i] = { ...next[i], [key]: v }
      onChange(next)
    }
    const addItem = () => {
      const blank: Record<string, any> = {}
      for (const f of itemFields) blank[f.key] = ''
      onChange([...items, blank])
    }
    const removeItem = (i: number) => {
      onChange(items.filter((_, idx) => idx !== i))
    }

    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-medium text-gray-600">{field.label}</label>
          <button type="button" onClick={addItem} className="text-xs text-indigo-600 hover:underline">+ Add</button>
        </div>
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-3 relative">
              <button type="button" onClick={() => removeItem(i)} className="absolute top-2 right-2 text-xs text-red-600 hover:underline">Remove</button>
              <div className="space-y-2 pr-14">
                {itemFields.map((itemField) => (
                  <ListItemFieldEditor
                    key={itemField.key}
                    subdomain={subdomain}
                    field={itemField}
                    value={item[itemField.key]}
                    onChange={(v) => updateItem(i, itemField.key, v)}
                  />
                ))}
              </div>
            </div>
          ))}
          {items.length === 0 && <div className="text-xs text-gray-400">No items yet — click "+ Add".</div>}
        </div>
      </div>
    )
  }

  return null
}

function ListItemFieldEditor({
  subdomain,
  field,
  value,
  onChange,
}: {
  subdomain: string
  field: ListItemFieldDef
  value: any
  onChange: (v: any) => void
}) {
  const [pickerOpen, setPickerOpen] = useState(false)

  if (field.type === 'textarea') {
    return (
      <div>
        <label className="block text-[11px] text-gray-500 mb-0.5">{field.label}</label>
        <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} rows={2} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
      </div>
    )
  }

  if (field.type === 'image') {
    return (
      <div>
        <label className="block text-[11px] text-gray-500 mb-0.5">{field.label}</label>
        <div className="flex items-center gap-2">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="w-10 h-10 rounded object-cover border border-gray-200" />
          ) : (
            <div className="w-10 h-10 rounded bg-gray-50 border border-dashed border-gray-300" />
          )}
          <button type="button" onClick={() => setPickerOpen(true)} className="text-xs text-indigo-600 hover:underline">Choose</button>
        </div>
        <MediaPicker
          subdomain={subdomain}
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={(file) => { onChange(permanentMediaUrl(file.id)); setPickerOpen(false) }}
        />
      </div>
    )
  }

  return (
    <div>
      <label className="block text-[11px] text-gray-500 mb-0.5">{field.label}</label>
      <input value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
    </div>
  )
}
