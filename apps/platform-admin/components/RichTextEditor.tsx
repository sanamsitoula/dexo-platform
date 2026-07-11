'use client'

import { useEffect, useRef } from 'react'

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

  function insertImage() {
    const url = window.prompt('Image URL (https://…)')
    if (url) exec('insertImage', url)
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
    { label: '🖼', title: 'Insert image by URL', onClick: insertImage },
    { label: '✕', title: 'Clear formatting', onClick: () => exec('removeFormat') },
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
    </div>
  )
}
