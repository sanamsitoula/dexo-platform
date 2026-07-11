// Permission glob helpers shared by the roles UI.
// Role.permissions is a JSON array of strings: 'resource:action', 'resource:*', '*:action' or '*'.

export const PERMISSION_RESOURCES = [
  'crm',
  'blog',
  'billing',
  'attendance',
  'subscriptions',
  'website_builder',
  'roles',
  'users',
  'settings',
  'reports',
] as const

export const PERMISSION_ACTIONS = ['view', 'create', 'edit', 'delete', 'manage'] as const

// Plan module key → permission resource. Resources not listed here
// (subscriptions, roles, users, settings, reports) are never plan-gated.
export const MODULE_RESOURCE_MAP: Record<string, string> = {
  crm: 'crm',
  blog: 'blog',
  billing_invoice: 'billing',
  attendance: 'attendance',
  website_builder: 'website_builder',
}

/**
 * Restrict the permission resource catalog to what the tenant's plan enables.
 * `modules` comes from GET /subscriptions/tenant/:id/modules; pass null to
 * fail open (all resources shown).
 */
export function resourcesForModules(
  modules: Record<string, boolean> | null | undefined
): readonly string[] {
  if (!modules) return PERMISSION_RESOURCES
  const disabled = new Set(
    Object.entries(MODULE_RESOURCE_MAP)
      .filter(([moduleKey]) => modules[moduleKey] === false)
      .map(([, resource]) => resource)
  )
  return PERMISSION_RESOURCES.filter((r) => !disabled.has(r))
}

export function resourceLabel(resource: string): string {
  return resource.replace(/_/g, ' ')
}

/** True when the glob array grants `resource:action`. */
export function hasPermission(permissions: string[], resource: string, action: string): boolean {
  return (permissions || []).some((p) => {
    if (typeof p !== 'string') return false
    if (p === '*' || p === '*:*') return true
    const [pr, pa] = p.split(':')
    if (pa === undefined) return false
    return (pr === '*' || pr === resource) && (pa === '*' || pa === action)
  })
}

/** Expand a glob array into a Set of 'resource:action' cells over the known catalog. */
export function expandPermissions(permissions: string[]): Set<string> {
  const cells = new Set<string>()
  for (const resource of PERMISSION_RESOURCES) {
    for (const action of PERMISSION_ACTIONS) {
      if (hasPermission(permissions, resource, action)) {
        cells.add(`${resource}:${action}`)
      }
    }
  }
  return cells
}

/** Compress a cell Set back into compact permission strings ('resource:*' when a full row is selected). */
export function compressPermissions(cells: Set<string>): string[] {
  const result: string[] = []
  for (const resource of PERMISSION_RESOURCES) {
    const selected = PERMISSION_ACTIONS.filter((a) => cells.has(`${resource}:${a}`))
    if (selected.length === PERMISSION_ACTIONS.length) {
      result.push(`${resource}:*`)
    } else {
      selected.forEach((a) => result.push(`${resource}:${a}`))
    }
  }
  return result
}
