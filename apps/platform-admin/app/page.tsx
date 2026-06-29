'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

const industries = [
  { name: 'Fitness Centers', icon: '💪', color: 'from-orange-500 to-red-500' },
  { name: 'Schools & Education', icon: '📚', color: 'from-blue-500 to-indigo-500' },
  { name: 'Restaurants & Cafes', icon: '🍕', color: 'from-red-500 to-orange-500' },
  { name: 'Ecommerce', icon: '🛒', color: 'from-purple-500 to-violet-500' },
  { name: 'Logistics & Delivery', icon: '🚚', color: 'from-cyan-500 to-blue-500' },
  { name: 'Tailor Shops', icon: '✂️', color: 'from-pink-500 to-rose-500' },
  { name: 'Coaching Institutes', icon: '🎓', color: 'from-emerald-500 to-green-500' },
  { name: 'Salons & Spas', icon: '💇', color: 'from-purple-500 to-fuchsia-500' },
  { name: 'Hotels & Hospitality', icon: '🏨', color: 'from-amber-500 to-yellow-500' },
  { name: 'Healthcare', icon: '🏥', color: 'from-sky-500 to-blue-500' },
]

const stats = [
  { label: 'Business Types', value: '12+', icon: '🏢' },
  { label: 'Active Tenants', value: '100+', icon: '📈' },
  { label: 'Users Served', value: '10K+', icon: '👥' },
  { label: 'Uptime', value: '99.9%', icon: '⚡' },
]

const features = [
  {
    title: 'Multi-Tenant Architecture',
    description: 'Each business gets their own isolated workspace with custom branding, themes, and settings.',
    icon: '🏗️',
  },
  {
    title: 'Industry-Specific Themes',
    description: '10+ premium themes designed for specific industries. Customize colors, menus, and features.',
    icon: '🎨',
  },
  {
    title: 'Role-Based Access Control',
    description: 'Granular permissions for every user role. From super admin to end customer.',
    icon: '🔐',
  },
  {
    title: 'Real-time Analytics',
    description: 'Track performance, revenue, and user engagement across all tenants.',
    icon: '📊',
  },
  {
    title: 'Subscription & Billing',
    description: 'Built-in subscription management with Stripe-ready payment processing.',
    icon: '💳',
  },
  {
    title: 'API-First Design',
    description: 'RESTful APIs with Swagger documentation. Integrate with any system.',
    icon: '🔌',
  },
]

export default function AdminHome() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="text-center">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-8">
                <span className="text-blue-400 text-sm font-medium">🚀 Trusted by 100+ businesses worldwide</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
                The Platform That
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                  Powers Any Business
                </span>
              </h1>
              <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-10">
                Dexo is a multi-tenant SaaS engine that adapts to any industry — fitness centers, schools, restaurants, ecommerce, logistics, and more. One platform, unlimited possibilities.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/login"
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all transform hover:scale-105 shadow-lg shadow-blue-500/25"
                >
                  Sign In to Admin
                </Link>
                <Link
                  href="/dashboard"
                  className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg border border-white/20 transition-all"
                >
                  View Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-slate-800/50 border-y border-slate-700">
          <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, i) => (
                <div key={i} className="text-center">
                  <span className="text-3xl mb-2 block">{stat.icon}</span>
                  <div className="text-3xl font-bold text-white">{stat.value}</div>
                  <div className="text-slate-400 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Industries Section */}
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Built for Every Industry
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              From fitness to healthcare, education to hospitality — Dexo adapts to your business needs with industry-specific themes and features.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {industries.map((industry, i) => (
              <div
                key={i}
                className="group relative bg-slate-800/50 rounded-xl p-6 border border-slate-700 hover:border-slate-500 transition-all hover:transform hover:scale-105 cursor-pointer"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${industry.color} opacity-0 group-hover:opacity-10 rounded-xl transition-opacity`}></div>
                <span className="text-4xl mb-3 block">{industry.icon}</span>
                <h3 className="text-white font-medium text-sm">{industry.name}</h3>
              </div>
            ))}
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-slate-800/30 py-20">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Everything You Need
              </h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                A complete platform with all the tools to run and scale your business.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature, i) => (
                <div
                  key={i}
                  className="bg-slate-800/50 rounded-xl p-8 border border-slate-700 hover:border-blue-500/50 transition-all"
                >
                  <span className="text-4xl mb-4 block">{feature.icon}</span>
                  <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                  <p className="text-slate-400">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Transform Your Business?
            </h2>
            <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
              Join 100+ businesses already using Dexo to streamline their operations and grow their revenue.
            </p>
            <Link
              href="/login"
              className="inline-block px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-all transform hover:scale-105"
            >
              Get Started Free
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 py-8">
          <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
            <p>Dexo Platform — Multi-tenant SaaS Engine</p>
            <p className="mt-1">Proprietary and Confidential</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user.firstName || 'Admin'}!</h1>
        <p className="mt-2 text-gray-600">Manage your platform from the central dashboard.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/dashboard" className="group">
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border-l-4 border-blue-500">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900 group-hover:text-blue-600">Dashboard</h3>
                <p className="text-sm text-gray-500">View platform statistics</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/tenants" className="group">
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border-l-4 border-green-500">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900 group-hover:text-green-600">Tenants</h3>
                <p className="text-sm text-gray-500">Manage tenant organizations</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/tenants/new" className="group">
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border-l-4 border-purple-500">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900 group-hover:text-purple-600">Create Tenant</h3>
                <p className="text-sm text-gray-500">Onboard new business</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/users" className="group">
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border-l-4 border-indigo-500">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900 group-hover:text-indigo-600">Users</h3>
                <p className="text-sm text-gray-500">Manage platform users</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/roles" className="group">
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border-l-4 border-yellow-500">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900 group-hover:text-yellow-600">Roles</h3>
                <p className="text-sm text-gray-500">Configure roles and permissions</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/subscriptions" className="group">
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border-l-4 border-pink-500">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-pink-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900 group-hover:text-pink-600">Subscriptions</h3>
                <p className="text-sm text-gray-500">Manage plans and billing</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/audit" className="group">
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border-l-4 border-gray-500">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-gray-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900 group-hover:text-gray-600">Audit Logs</h3>
                <p className="text-sm text-gray-500">View activity history</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/notifications" className="group">
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border-l-4 border-cyan-500">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-cyan-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900 group-hover:text-cyan-600">Notifications</h3>
                <p className="text-sm text-gray-500">Manage templates</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/settings" className="group">
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border-l-4 border-slate-500">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-slate-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900 group-hover:text-slate-600">Settings</h3>
                <p className="text-sm text-gray-500">Platform configuration</p>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
