const testimonials = [
  {
    quote:
      'We rolled out branded member portals across six locations in a weekend. The industry-specific workflows saved us months of custom development.',
    role: 'Gym Owner, Multi-Branch Fitness Chain',
  },
  {
    quote:
      'Switching tenants between our salons used to mean juggling separate tools. Now everything — bookings, staff, billing — lives in one adaptable platform.',
    role: 'Operations Director, Salon & Spa Group',
  },
  {
    quote:
      'The role-based access and white-label branding let us resell the platform to our own school clients without exposing a single line of code.',
    role: 'Founder, EdTech Reseller',
  },
]

export default function Testimonials() {
  return (
    <section className="relative bg-[#05050a] px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            className="text-3xl font-bold text-white sm:text-4xl"
            style={{ fontFamily: 'var(--font-grotesk), Space Grotesk, system-ui, sans-serif' }}
          >
            Trusted by teams across industries
          </h2>
          <p className="mt-4 text-sm uppercase tracking-widest text-zinc-500">
            Illustrative feedback based on typical Dexo deployments
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <div
              key={t.role}
              className="flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-6"
            >
              <p className="text-zinc-200">&ldquo;{t.quote}&rdquo;</p>
              <p className="mt-6 text-sm font-medium text-cyan-300">{t.role}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
