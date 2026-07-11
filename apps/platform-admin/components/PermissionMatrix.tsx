'use client'

import {
  PERMISSION_RESOURCES,
  PERMISSION_ACTIONS,
  resourceLabel,
} from '@/lib/permissions'

interface PermissionMatrixProps {
  /** Set of 'resource:action' cells currently granted. */
  cells: Set<string>
  /** When provided the matrix is editable; omit for read-only display. */
  onToggle?: (resource: string, action: string) => void
  /** Toggle a whole resource row (manage-all). Only used when editable. */
  onToggleRow?: (resource: string) => void
  /** Restrict rows to these resources (e.g. modules enabled by the tenant's plan). */
  resources?: readonly string[]
}

export default function PermissionMatrix({ cells, onToggle, onToggleRow, resources }: PermissionMatrixProps) {
  const editable = !!onToggle
  const rows = resources ?? PERMISSION_RESOURCES

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Resource
            </th>
            {PERMISSION_ACTIONS.map((action) => (
              <th
                key={action}
                className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {action}
              </th>
            ))}
            {editable && (
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                All
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {rows.map((resource) => {
            const fullRow = PERMISSION_ACTIONS.every((a) => cells.has(`${resource}:${a}`))
            return (
              <tr key={resource} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-medium text-gray-900 capitalize whitespace-nowrap">
                  {resourceLabel(resource)}
                </td>
                {PERMISSION_ACTIONS.map((action) => {
                  const granted = cells.has(`${resource}:${action}`)
                  return (
                    <td key={action} className="px-3 py-2 text-center">
                      {editable ? (
                        <input
                          type="checkbox"
                          checked={granted}
                          onChange={() => onToggle!(resource, action)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                      ) : granted ? (
                        <span className="text-green-600 font-semibold">✓</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  )
                })}
                {editable && (
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={fullRow}
                      onChange={() => onToggleRow?.(resource)}
                      title={`Toggle all ${resourceLabel(resource)} permissions`}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
