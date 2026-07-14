'use client'

import { useEffect, useRef, useState } from 'react'
import MediaPicker, { permanentMediaUrl } from './MediaPicker'
import { resolveTenantAdminSubdomain } from '@/lib/subdomain'
import { aiApi } from '@/lib/api'

/**
 * Lightweight rich-text editor built on contentEditable + document.execCommand.
 * No external dependencies. Emits HTML via onChange.
 */
export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write your content here…',
  minHeight = 320,
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
}) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const subdomain = resolveTenantAdminSubdomain()
  // Track the last HTML we emitted so external value changes (e.g. after a
  // fetch) update the editor, but our own keystrokes don't reset the caret.
  const lastEmitted = useRef<string>('')

  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    if (value !== lastEmitted.current && value !== el.innerHTML) {
      el.innerHTML = value || ''
      lastEmitted.current = value || ''
    }
  }, [value])

  function emit() {
    const el = editorRef.current
    if (!el) return
    lastEmitted.current = el.innerHTML
    onChange(el.innerHTML)
  }

  function exec(command: string, arg?: string) {
    editorRef.current?.focus()
    document.execCommand(command, false, arg)
    emit()
  }

  function insertLink() {
    const url = window.prompt('Link URL (https://…)')
    if (url) exec('createLink', url)
  }

  function insertImageFromLibrary() {
    setPickerOpen(true)
  }

  function insertImageByUrl() {
    const url = window.prompt('Image URL (https://…)')
    if (url) exec('insertImage', url)
  }

  async function aiWrite() {
    const brief = window.prompt('What should this section say? (e.g. "Hero intro for a boutique gym, friendly tone, mention 24/7 access")')
    if (!brief || !brief.trim()) return
    setAiError(null)
    setAiBusy(true)
    const r = await aiApi.writeContent(subdomain, brief.trim())
    setAiBusy(false)
    if (r.error || !r.data?.reply) {
      setAiError(r.error || 'AI did not return any content')
      return
    }
    // Insert as a fresh block at the end rather than replacing selection —
    // AI output is HTML (headings/paragraphs), not a plain insertHTML-safe
    // inline string, so appending is the least surprising default.
    const el = editorRef.current
    if (el) {
      el.innerHTML += r.data.reply
      emit()
    }
  }

  const buttons: { label: React.ReactNode; title: string; onClick: () => void; className?: string }[] = [
    { label: <b>B</b>, title: 'Bold', onClick: () => exec('bold') },
    { label: <i>I</i>, title: 'Italic', onClick: () => exec('italic') },
    { label: <u>U</u>, title: 'Underline', onClick: () => exec('underline') },
    { label: 'H2', title: 'Heading 2', onClick: () => exec('formatBlock', '<h2>') },
    { label: 'H3', title: 'Heading 3', onClick: () => exec('formatBlock', '<h3>') },
    { label: '¶', title: 'Paragraph', onClick: () => exec('formatBlock', '<p>') },
    { label: '• List', title: 'Bullet list', onClick: () => exec('insertUnorderedList') },
    { label: '1. List', title: 'Numbered list', onClick: () => exec('insertOrderedList') },
    { label: '❝', title: 'Blockquote', onClick: () => exec('formatBlock', '<blockquote>') },
    { label: '🔗', title: 'Insert link', onClick: insertLink },
    { label: '🖼 Library', title: 'Insert image from Media Library', onClick: insertImageFromLibrary },
    { label: '🖼 URL', title: 'Insert image by URL', onClick: insertImageByUrl },
    { label: '✕', title: 'Clear formatting', onClick: () => exec('removeFormat') },
    { label: aiBusy ? '✨ Writing…' : '✨ AI Write', title: 'Draft this section with AI (review before saving)', onClick: aiWrite },
  ]

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
      <div className="flex flex-wrap gap-1 border-b border-gray-200 bg-gray-50 px-2 py-1.5">
        {buttons.map((btn, i) => (
          <button
            key={i}
            type="button"
            title={btn.title}
            onMouseDown={(e) => e.preventDefault()}
            onClick={btn.onClick}
            className="px-2.5 py-1 rounded text-sm text-gray-700 hover:bg-gray-200 border border-transparent hover:border-gray-300"
          >
            {btn.label}
          </button>
        ))}
      </div>
      {aiError && (
        <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-b border-red-100">{aiError}</div>
      )}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        data-placeholder={placeholder}
        className="rte-content prose prose-sm max-w-none px-4 py-3 focus:outline-none text-gray-900"
        style={{ minHeight }}
      />
      <style jsx global>{`
        .rte-content:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
          display: block;
        }
        .rte-content h2 { font-size: 1.4rem; font-weight: 700; margin: 0.8em 0 0.4em; }
        .rte-content h3 { font-size: 1.15rem; font-weight: 600; margin: 0.8em 0 0.4em; }
        .rte-content ul { list-style: disc; padding-left: 1.5rem; margin: 0.5em 0; }
        .rte-content ol { list-style: decimal; padding-left: 1.5rem; margin: 0.5em 0; }
        .rte-content blockquote { border-left: 3px solid #6366f1; padding-left: 0.9rem; color: #4b5563; font-style: italic; margin: 0.6em 0; }
        .rte-content a { color: #4f46e5; text-decoration: underline; }
        .rte-content img { max-width: 100%; border-radius: 0.5rem; margin: 0.5em 0; }
        .rte-content p { margin: 0.4em 0; }
      `}</style>
      <MediaPicker
        subdomain={subdomain}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(file) => {
          setPickerOpen(false)
          exec('insertImage', permanentMediaUrl(file.id))
        }}
      />
    </div>
  )
}
