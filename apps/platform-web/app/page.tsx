'use client'

import BlogSection from '@/components/BlogSection'
import SectionDivider from '@/components/SectionDivider'
import Hero from '@/components/sections/Hero'
import About from '@/components/sections/About'
import Services from '@/components/sections/Services'
import Portfolio from '@/components/sections/Portfolio'
import Testimonials from '@/components/sections/Testimonials'
import Pricing from '@/components/sections/Pricing'
import FAQ from '@/components/sections/FAQ'
import Contact from '@/components/sections/Contact'
import MagneticButton from '@/components/MagneticButton'

export default function HomePage() {
  return (
    <div className="flex-1 bg-[#05050a]">
      <Hero />
      <SectionDivider variant="wave" />
      <About />
      <SectionDivider variant="diagonal" />
      <Services />
      <SectionDivider variant="glow" />
      <Portfolio />
      <SectionDivider variant="wave" flip />
      <Testimonials />
      <SectionDivider variant="glow" />
      <Pricing />
      <SectionDivider variant="diagonal" flip />
      <FAQ />

      <div className="bg-[#05050a]">
        <BlogSection />
      </div>

      <SectionDivider variant="glow" />
      <Contact />

      <section className="relative bg-[#05050a] px-4 py-24 text-center sm:px-6 lg:px-8">
        <h2
          className="text-3xl font-bold text-white sm:text-4xl"
          style={{ fontFamily: 'var(--font-grotesk), Space Grotesk, system-ui, sans-serif' }}
        >
          Ready to transform your business?
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-400">
          Join businesses already using Dexo to streamline their operations.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <MagneticButton href="/register" variant="primary">
            Get Started Free
          </MagneticButton>
          <MagneticButton href="/login" variant="secondary">
            Sign In
          </MagneticButton>
        </div>
      </section>
    </div>
  )
}
