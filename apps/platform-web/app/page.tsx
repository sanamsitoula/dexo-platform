import Link from 'next/link';

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
  { name: 'SME', icon: '🏢' }
];

const features = [
  {
    title: 'Multi-Tenant Architecture',
    description: 'Each tenant gets isolated data, branding, and configuration while sharing the same codebase.',
    icon: '🏢'
  },
  {
    title: 'Role-Based Access Control',
    description: 'Fine-grained permissions system with predefined roles for each industry.',
    icon: '🔐'
  },
  {
    title: 'Internationalization',
    description: 'Support for 10+ languages and currencies with automatic localization.',
    icon: '🌍'
  },
  {
    title: 'Custom Branding',
    description: 'White-label solution with customizable logos, colors, and themes per tenant.',
    icon: '🎨'
  },
  {
    title: 'API-First Approach',
    description: 'RESTful APIs with webhook support for seamless integrations.',
    icon: '🔌'
  },
  {
    title: 'Advanced Analytics',
    description: 'Real-time dashboards and reporting tools tailored to each industry.',
    icon: '📊'
  }
];

const stats = [
  { value: '12+', label: 'Industry Domains' },
  { value: '200+', label: 'Modules & Features' },
  { value: '50+', label: 'Pre-built Roles' },
  { value: '99.9%', label: 'Uptime SLA' }
];

export default function HomePage() {
  return (
    <div className="flex-1">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 py-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>
        <div className="relative max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            Domain-Driven Multi-Tenant SaaS
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight">
            Dexo Platform
          </h1>
          <p className="mt-6 text-2xl sm:text-3xl text-indigo-100 font-semibold">
            One Platform. 12 Industries. Unlimited Growth.
          </p>
          <p className="mt-4 text-lg text-indigo-200 max-w-2xl mx-auto">
            Transform your business with our domain-driven architecture. Whether you run a fitness center, salon, school, restaurant, hotel, or any business — Dexo adapts to you.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/register"
              className="px-8 py-3.5 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-gray-50 transition-colors shadow-lg"
            >
              Start Free Trial
            </Link>
            <Link
              href="/login"
              className="px-8 py-3.5 bg-white/10 backdrop-blur-sm text-white border border-white/30 rounded-lg font-semibold hover:bg-white/20 transition-colors"
            >
              Sign In
            </Link>
          </div>
          <div className="mt-8 flex justify-center items-center gap-6 text-sm text-indigo-200">
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414-1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Free 14-day trial
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414-1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              No credit card required
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414-1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Cancel anytime
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 max-w-7xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center text-gray-900">12 industry-specific platforms</h2>
        <p className="mt-3 text-center text-gray-600">Each tenant gets a fully-configured platform tailored to its industry.</p>
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {['Fitness', 'Restaurant', 'Salon & Spa', 'Hotel', 'Healthcare', 'School', 'Coaching', 'Ecommerce', 'Logistics', 'Tailor', 'NGO', 'SME'].map((it) => (
            <Link key={it} href={`/domains/${it.toLowerCase().replace(/ /g, '-').replace('&', 'and')}`} className="bg-white rounded-lg shadow p-4 hover:shadow-md text-sm font-medium text-center">
              {it}
            </Link>
          ))}
        </div>
      </section>

      {/* Industries Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              12 Industry Domains, One Platform
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Choose your industry. We automatically provision the right modules, menus, themes, and workflows.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {industries.map((industry) => (
              <div
                key={industry.name}
                className="p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all text-center"
              >
                <div className="text-4xl mb-2">{industry.icon}</div>
                <h3 className="text-sm font-semibold text-gray-900">{industry.name}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Everything You Need to Run Your Business
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              From authentication to analytics, Dexo provides everything out-of-the-box.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-2xl">{feature.icon}</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-indigo-600">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="text-4xl sm:text-5xl font-bold text-white">{stat.value}</div>
                <div className="mt-2 text-indigo-200">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Ready to Transform Your Business?
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Join thousands of businesses already using Dexo to streamline their operations.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/register"
              className="px-8 py-3.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors shadow-lg"
            >
              Get Started Free
            </Link>
            <Link
              href="/login"
              className="px-8 py-3.5 bg-white text-indigo-600 border-2 border-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}