import Link from 'next/link';

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
];

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
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-500">
            ← Back to Home
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">
            Features
          </h1>
          <p className="mt-2 text-gray-600">
            Everything you need to run your business on Dexo, out of the box.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
          {features.map((feature) => (
            <div key={feature.title} className="bg-white rounded-lg shadow-md p-6">
              <span className="text-2xl">{feature.icon}</span>
              <h3 className="mt-3 text-lg font-semibold text-gray-900">{feature.title}</h3>
              <p className="mt-1 text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-8 border-t border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Built for Every Industry</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {industries.map((industry) => (
              <div
                key={industry.name}
                className="bg-white rounded-lg shadow-sm p-4 text-center border border-gray-100"
              >
                <span className="text-2xl">{industry.icon}</span>
                <div className="mt-2 text-sm font-medium text-gray-900">{industry.name}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-gray-200 text-center">
          <p className="text-gray-600">
            Ready to get started?{' '}
            <Link href="/pricing" className="text-indigo-600 hover:text-indigo-500 font-medium">
              See pricing
            </Link>{' '}
            or{' '}
            <Link href="/register" className="text-indigo-600 hover:text-indigo-500 font-medium">
              start your free trial
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
