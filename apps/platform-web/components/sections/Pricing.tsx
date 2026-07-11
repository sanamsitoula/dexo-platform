'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import StatCounter from '@/components/StatCounter'

const PLANS = [
  { name: 'Free', price: '0', features: ['1 branch', '5 users', 'Community support'] },
  { name: 'Starter', price: '29', features: ['3 branches', '25 users', 'Email support', 'Branded subdomain'] },
  { name: 'Growth', price: '99', features: ['10 branches', '100 users', 'Priority support', 'Custom domain', 'SSO'], highlight: true },
  { name: 'Enterprise', price: '499', features: ['Unlimited', 'Unlimited users', '24/7 support', 'SLA', 'White-label'] },
]

export default function Pricing() {
  return (
    <section id="pricing" className="relative bg-[#08080f] px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7 }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2
            className="text-3xl font-bold text-white sm:text-4xl"
            style={{ fontFamily: 'var(--font-grotesk), Space Grotesk, system-ui, sans-serif' }}
          >
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-zinc-400">Start free. Scale as you grow.</p>
        </motion.div>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className={`flex flex-col rounded-2xl border p-6 backdrop-blur-md ${
                p.highlight
                  ? 'border-cyan-400/50 bg-gradient-to-b from-indigo-500/10 to-cyan-400/5 shadow-[0_0_40px_rgba(34,211,238,0.15)]'
                  : 'border-white/10 bg-white/5'
              }`}
            >
              {p.highlight && (
                <span className="mb-3 inline-block w-fit rounded-full bg-cyan-400/20 px-3 py-1 text-xs font-semibold text-cyan-300">
                  Most Popular
                </span>
              )}
              <h3 className="text-xl font-bold text-white">{p.name}</h3>
              <div className="mt-2 flex items-end gap-1">
                <span className="text-sm text-zinc-400">$</span>
                <StatCounter value={p.price} label="" duration={1.2} />
              </div>
              <span className="-mt-2 text-xs text-zinc-500">/mo</span>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-zinc-400">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="text-cyan-400">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup/create"
                className="mt-6 block rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:border-cyan-400/50 hover:bg-white/10"
              >
                Get started
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
