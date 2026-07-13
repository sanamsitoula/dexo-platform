import MagneticButton from '@/components/MagneticButton'

export default function Hero() {
  return (
    <section
      id="hero"
      className="relative flex min-h-[92vh] w-full flex-col items-center justify-center overflow-hidden bg-[#05050a] px-4 pt-16"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(99,102,241,0.18),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(34,211,238,0.12),transparent_55%)]" />

      <div className="relative z-10 mx-auto max-w-5xl text-center">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-300 backdrop-blur-sm">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          Domain-Driven Multi-Tenant SaaS
        </div>

        <h1
          className="text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl"
          style={{ fontFamily: 'var(--font-grotesk), Space Grotesk, system-ui, sans-serif' }}
        >
          Dexo Platform
        </h1>

        <p className="mt-6 bg-gradient-to-r from-indigo-300 via-cyan-200 to-violet-300 bg-clip-text text-2xl font-semibold text-transparent sm:text-3xl">
          One Platform. 12 Industries. Unlimited Growth.
        </p>

        <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-400">
          Transform your business with our domain-driven architecture. Whether you run a fitness
          center, salon, school, restaurant, hotel, or any business — Dexo adapts to you.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <MagneticButton href="/register" variant="primary">
            Start Free Trial
          </MagneticButton>
          <MagneticButton href="/login" variant="secondary">
            Sign In
          </MagneticButton>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-zinc-500">
          <span>Free 14-day trial</span>
          <span>No credit card required</span>
          <span>Cancel anytime</span>
        </div>
      </div>
    </section>
  )
}
