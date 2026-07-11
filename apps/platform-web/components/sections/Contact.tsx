'use client'

import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import MagneticButton from '@/components/MagneticButton'

export default function Contact() {
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <section id="contact-section" className="relative bg-[#08080f] px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7 }}
          className="text-center"
        >
          <h2
            className="text-3xl font-bold text-white sm:text-4xl"
            style={{ fontFamily: 'var(--font-grotesk), Space Grotesk, system-ui, sans-serif' }}
          >
            Let&apos;s talk about your business
          </h2>
          <p className="mt-4 text-lg text-zinc-400">
            Have questions or want a guided walkthrough? Send us a message.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-12 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-md"
        >
          {submitted ? (
            <div className="py-10 text-center text-zinc-200">
              Thanks — we received your message and will be in touch shortly.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-zinc-300">
                    Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-cyan-400/60 focus:outline-none"
                    placeholder="Jane Doe"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-zinc-300">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-cyan-400/60 focus:outline-none"
                    placeholder="jane@company.com"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="message" className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={4}
                  className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-cyan-400/60 focus:outline-none"
                  placeholder="Tell us about your business..."
                />
              </div>
              <div className="flex justify-center pt-2">
                <button
                  type="submit"
                  className="relative inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400 px-8 py-3.5 text-sm font-semibold text-white shadow-[0_0_30px_rgba(99,102,241,0.4)] transition-shadow hover:shadow-[0_0_45px_rgba(34,211,238,0.55)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
                >
                  Send Message
                </button>
              </div>
            </form>
          )}
        </motion.div>

        <div className="mt-8 flex justify-center">
          <MagneticButton href="/contact" variant="secondary">
            Visit full contact page
          </MagneticButton>
        </div>
      </div>
    </section>
  )
}
