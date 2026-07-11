import Link from 'next/link';

const stats = [
  { value: '12+', label: 'Industry Domains' },
  { value: '200+', label: 'Modules & Features' },
  { value: '50+', label: 'Pre-built Roles' },
  { value: '99.9%', label: 'Uptime SLA' },
];

const values = [
  {
    title: 'Multi-tenant by design',
    description: 'One codebase, unlimited businesses — each tenant gets isolated data, branding, and configuration without running separate deployments.',
    icon: '🏢',
  },
  {
    title: 'Built for every industry',
    description: 'From gyms to restaurants to clinics, Dexo ships pre-configured modules and roles so a new tenant is productive on day one.',
    icon: '🌐',
  },
  {
    title: 'Reliable at the core',
    description: 'API-first architecture, role-based access control, and a 99.9% uptime SLA back every tenant running on the platform.',
    icon: '🔐',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-500">
            ← Back to Home
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">
            About Dexo Platform
          </h1>
          <p className="mt-2 text-gray-600">
            Dexo is a multi-tenant SaaS platform engine — a single system that powers independent
            businesses across a dozen industries, each with its own branding, data, and workflows.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Our Mission</h2>
          <p className="text-gray-600 leading-relaxed">
            Standing up software for a new business shouldn't mean months of custom development.
            Dexo gives operators — gyms, restaurants, salons, clinics, schools, and more — a
            ready-to-run platform with the booking, membership, staff, and billing tools their
            industry needs, while giving each tenant full control over their own branding and data.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-10">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="text-2xl font-bold text-indigo-600">{stat.value}</div>
              <div className="mt-1 text-sm text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-8 border-t border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">What We Believe</h2>
          <div className="space-y-4">
            {values.map((value) => (
              <div key={value.title} className="border-l-4 border-indigo-500 pl-4">
                <h3 className="font-medium text-gray-900">
                  <span className="mr-2">{value.icon}</span>
                  {value.title}
                </h3>
                <p className="mt-1 text-gray-600">{value.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-gray-200 text-center">
          <p className="text-gray-600">
            Want to see it in action?{' '}
            <Link href="/register" className="text-indigo-600 hover:text-indigo-500 font-medium">
              Start your free trial
            </Link>{' '}
            or{' '}
            <Link href="/contact" className="text-indigo-600 hover:text-indigo-500 font-medium">
              get in touch
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
