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
