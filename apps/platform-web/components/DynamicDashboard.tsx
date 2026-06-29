'use client'

import { useDomainWidgets } from '@/lib/domain-widgets'
import { useTenantContext } from '@/lib/tenant-context'
import { useDomainInfo } from '@/lib/domain-info'

interface DynamicDashboardProps {
  roleCode?: string
  domainCode?: string
  widgetComponentMap?: Record<string, React.ComponentType<any>>
}

export default function DynamicDashboard({ roleCode, domainCode, widgetComponentMap = {} }: DynamicDashboardProps) {
  const { tenant } = useTenantContext()
  const effectiveDomainCode = domainCode || tenant?.subdomain || 'default'
  const { dashboardWidgets, loading, error } = useDomainWidgets(effectiveDomainCode, roleCode)
  const { domain } = useDomainInfo(effectiveDomainCode)

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
              <div className="h-8 bg-gray-200 rounded w-3/4" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          Error loading dashboard: {error}
        </div>
      </div>
    )
  }

  if (dashboardWidgets.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        {domain && (
          <p className="text-gray-600">
            Welcome to {domain.name}. No dashboard widgets configured yet.
          </p>
        )}
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md">
          Your dashboard is being set up. Widgets will appear here once configured.
        </div>
      </div>
    )
  }

  const renderWidget = (widget: any) => {
    const Component = widgetComponentMap[widget.component] || DefaultWidget

    return (
      <div key={widget.id} className="bg-white p-6 rounded-lg shadow">
        <Component widget={widget} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        {domain && (
          <p className="mt-2 text-gray-600">
            {domain.name} - {domain.description}
          </p>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dashboardWidgets.map(renderWidget)}
      </div>
    </div>
  )
}

function DefaultWidget({ widget }: { widget: any }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-600">
          {widget.icon && <span className="mr-2">{widget.icon}</span>}
          {widget.name}
        </h3>
      </div>
      {widget.description && (
        <p className="text-xs text-gray-500 mb-3">{widget.description}</p>
      )}
      <div className="text-2xl font-bold text-gray-900">
        {widget.config?.defaultValue || '0'}
      </div>
    </div>
  )
}
