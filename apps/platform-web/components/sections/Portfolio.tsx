'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

const industries = [
  { name: 'Fitness', icon: '🏋️‍♂️' },
  { name: 'Restaurant', icon: '🍽️' },
  { name: 'Salon & Spa', icon: '💇‍♀️' },
  { name: 'Hotel', icon: '🏨' },
  { name: 'Healthcare', icon: '🏥' },
  { name: 'School', icon: '🎓' },
  { name: 'Coaching', icon: '👨‍🏫' },
  { name: 'Ecommerce', icon: '🛒' },
  { name: 'Logistics', icon: '🚚' },
  { name: 'Tailor', icon: '👕' },
  { name: 'NGO', icon: '❤️' },
  { name: 'SME', icon: '🏢' },
]

export default function Portfolio() {
  return (
    <section id="industries" className="relative bg-[#08080f] px-4 py-24 sm:px-6 lg:px-8">
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
            12 industry domains, one platform
          </h2>
          <p className="mt-4 text-lg text-zinc-400">
            Choose your industry. We automatically provision the right modules, menus, themes, and
            workflows.
          </p>
        </motion.div>

        <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {industries.map((industry, i) => (
            <motion.div
              key={industry.name}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.4, delay: (i % 6) * 0.05 }}
            >
              <Link
                href={`/domains/${industry.name.toLowerCase().replace(/ /g, '-').replace('&', 'and')}`}
                className="group flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-5 text-center backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/40 hover:bg-white/10 hover:shadow-[0_0_30px_rgba(34,211,238,0.15)]"
              >
                <span className="text-3xl transition-transform duration-300 group-hover:scale-110">
                  {industry.icon}
                </span>
                <span className="text-sm font-medium text-zinc-200">{industry.name}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
