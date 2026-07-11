'use client'

import { useEffect, useState } from 'react'

export default function LoadingScreen() {
  const [visible, setVisible] = useState(true)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const fadeDelay = reduce ? 50 : 650
    const removeDelay = reduce ? 100 : 1100
    const t1 = setTimeout(() => setFading(true), fadeDelay)
    const t2 = setTimeout(() => setVisible(false), removeDelay)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  function skip() {
    setFading(true)
    setTimeout(() => setVisible(false), 300)
  }

  if (!visible) return null

  return (
    <div
      onClick={skip}
      role="status"
      aria-live="polite"
      aria-label="Loading Dexo Platform"
      className={`fixed inset-0 z-[999] flex flex-col items-center justify-center bg-[#05050a] transition-opacity duration-500 cursor-pointer ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <svg viewBox="0 0 96 96" width={56} height={56} role="img" aria-label="DEXO logo mark" className="animate-pulse">
        <path d="M16 62 48 46l32 16-32 16z" fill="#E4E4E7" />
        <path d="M16 48 48 32l32 16-32 16z" fill="#71717A" />
        <path d="M16 34 48 18l32 16-32 16z" fill="#6366F1" />
      </svg>
      <span
        className="mt-4 text-sm tracking-[0.3em] text-zinc-400"
        style={{ fontFamily: 'var(--font-grotesk), Space Grotesk, system-ui, sans-serif' }}
      >
        DEXO
      </span>
      <div className="mt-6 h-px w-40 overflow-hidden bg-white/10">
        <div className="h-full w-1/3 bg-gradient-to-r from-indigo-500 via-cyan-400 to-violet-500 animate-[loadbar_1s_ease-in-out_infinite]" />
      </div>
      <style>{`
        @keyframes loadbar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  )
}
