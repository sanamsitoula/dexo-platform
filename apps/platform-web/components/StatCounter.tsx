'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'

interface StatCounterProps {
  value: string
  label: string
  duration?: number
}

export default function StatCounter({ value, label, duration = 1.6 }: StatCounterProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const [display, setDisplay] = useState('0')

  const match = value.match(/^([\d.]+)(.*)$/)
  const numeric = match ? parseFloat(match[1]) : null
  const suffix = match ? match[2] : ''

  useEffect(() => {
    if (!inView) return
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (numeric === null) {
      setDisplay(value)
      return
    }
    if (reduce) {
      setDisplay(value)
      return
    }

    let start: number | null = null
    let raf = 0
    function step(ts: number) {
      if (start === null) start = ts
      const progress = Math.min(1, (ts - start) / (duration * 1000))
      const current = numeric! * progress
      const isInt = Number.isInteger(numeric)
      setDisplay((isInt ? Math.round(current) : current.toFixed(1)).toString())
      if (progress < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [inView, numeric, value, duration])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="text-center"
    >
      <div className="bg-gradient-to-r from-indigo-300 via-cyan-200 to-violet-300 bg-clip-text text-4xl font-bold text-transparent sm:text-5xl">
        {display}
        {suffix}
      </div>
      <div className="mt-2 text-sm text-zinc-400">{label}</div>
    </motion.div>
  )
}
