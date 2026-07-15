const features = [
  {
    title: 'Multi-Tenant Architecture',
    description: 'Each tenant gets isolated data, branding, and configuration while sharing the same codebase.',
    icon: '🏢',
  },
  {
    title: 'Role-Based Access Control',
    description: 'Fine-grained permissions system with predefined roles for each industry.',
    icon: '🔐',
  },
  {
    title: 'Internationalization',
    description: 'Support for 10+ languages and currencies with automatic localization.',
    icon: '🌍',
  },
  {
    title: 'Custom Branding',
    description: 'White-label solution with customizable logos, colors, and themes per tenant.',
    icon: '🎨',
  },
  {
    title: 'API-First Approach',
    description: 'RESTful APIs with webhook support for seamless integrations.',
    icon: '🔌',
  },
  {
    title: 'Advanced Analytics',
    description: 'Real-time dashboards and reporting tools tailored to each industry.',
    icon: '📊',
  },
]

export default function Services() {
  return (
    <section id="features" className="relative bg-[#05050a] px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            className="text-3xl font-bold text-white sm:text-4xl"
            style={{ fontFamily: 'var(--font-grotesk), Space Grotesk, system-ui, sans-serif' }}
          >
            Everything you need to run your business
          </h2>
          <p className="mt-4 text-lg text-zinc-400">
            From authentication to analytics, Dexo provides everything out-of-the-box.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="h-full rounded-2xl border border-white/10 bg-white/5 p-6 transition-colors duration-200 hover:border-cyan-400/40"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-400/20 text-2xl">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
              <p className="mt-2 text-sm text-zinc-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
