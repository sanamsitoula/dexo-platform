'use client'

import { motion } from 'framer-motion'
import StatCounter from '@/components/StatCounter'

const stats = [
  { value: '12', label: 'Industry Domains' },
  { value: '200', label: 'Modules & Features' },
  { value: '50', label: 'Pre-built Roles' },
  { value: '99.9', label: 'Uptime SLA %' },
]

export default function About() {
  return (
    <section id="about" className="relative bg-[#05050a] px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7 }}
          className="mx-auto max-w-3xl text-center"
        >
          <h2
            className="text-3xl font-bold text-white sm:text-4xl"
            style={{ fontFamily: 'var(--font-grotesk), Space Grotesk, system-ui, sans-serif' }}
          >
            One codebase. Every industry.
          </h2>
          <p className="mt-4 text-lg text-zinc-400">
            Dexo is a domain-driven multi-tenant platform engine. Provision a fully-configured,
            industry-specific product for any business in minutes — with isolated data, custom
            branding, and the right workflows out of the box.
          </p>
        </motion.div>

        <div className="mt-16 grid grid-cols-2 gap-8 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-md sm:grid-cols-4">
          {stats.map((s) => (
            <StatCounter key={s.label} value={s.value} label={s.label} />
          ))}
        </div>
      </div>
    </section>
  )
}
