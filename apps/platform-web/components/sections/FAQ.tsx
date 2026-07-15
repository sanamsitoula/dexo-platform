'use client'

import { useState } from 'react'

const faqs = [
  {
    q: 'What is a domain-driven multi-tenant platform?',
    a: 'Each tenant (business) runs on the same Dexo codebase but gets isolated data, its own branding, and an industry-specific configuration — modules, menus, roles, and workflows automatically tailored to their domain (e.g. fitness, salon, restaurant).',
  },
  {
    q: 'Can I white-label the platform for my own customers?',
    a: 'Yes. Growth and Enterprise plans support full white-labeling, including custom domains, branded logos and colors, and hiding all Dexo references.',
  },
  {
    q: 'How long does onboarding take?',
    a: 'Most tenants are fully provisioned in minutes — pick your industry, and Dexo automatically sets up the right modules, roles, and default workflows for you.',
  },
  {
    q: 'Do you offer an API?',
    a: 'Yes, Dexo is API-first with RESTful endpoints and webhook support for every module, so you can integrate with your existing tools or build custom automations.',
  },
  {
    q: 'What happens if I outgrow my plan?',
    a: 'You can upgrade at any time — branches, users, and features scale seamlessly with zero downtime migrations between tiers.',
  },
]

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section className="relative bg-[#05050a] px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <h2
            className="text-3xl font-bold text-white sm:text-4xl"
            style={{ fontFamily: 'var(--font-grotesk), Space Grotesk, system-ui, sans-serif' }}
          >
            Frequently asked questions
          </h2>
        </div>

        <div className="mt-12 space-y-3">
          {faqs.map((item, i) => {
            const isOpen = open === i
            return (
              <div
                key={item.q}
                className="overflow-hidden rounded-2xl border border-white/10 bg-white/5"
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
                >
                  <span className="font-medium">{item.q}</span>
                  <span className={`text-xl text-cyan-300 transition-transform duration-150 ${isOpen ? 'rotate-45' : ''}`}>
                    +
                  </span>
                </button>
                {isOpen && (
                  <div className="px-6">
                    <p className="pb-5 text-sm text-zinc-400">{item.a}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
