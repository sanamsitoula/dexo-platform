'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { tenantRolesApi } from '@/lib/api';
import { PageHeader, Card, EmptyState, Badge, Btn } from '../_ui';
import PermissionMatrix from '@/components/PermissionMatrix';
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { expandPermissions } from '@/lib/permissions';

interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  tenantId?: string | null;
  permissions?: string[];
  createdAt: string;
}

export default function RolesPage() {
  const subdomain = resolveTenantAdminSubdomain();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailRole, setDetailRole] = useState<Role | null>(null);

  useEffect(() => {
    fetchRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subdomain]);

  async function fetchRoles() {
    setLoading(true);
    const r = await tenantRolesApi.list(subdomain);
    if (r.data) {
      const list = Array.isArray(r.data) ? r.data : (r.data as any).items || [];
      setRoles(list);
    } else if (r.error) {
      setError(r.error);
    }
    setLoading(false);
  }

  async function handleDelete(role: Role) {
    if (role.isSystem) {
      alert('System roles cannot be deleted');
      return;
    }
    if (!confirm(`Delete role "${role.name}"? This cannot be undone.`)) return;
    const r = await tenantRolesApi.delete(subdomain, role.id);
    if (r.error) alert(r.error);
    else fetchRoles();
  }

  return (
    <div>
      <PageHeader
        title="Roles"
        subtitle="Control what each staff role can see and do in this gym"
        action={
          <Link href="/roles/new" className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition">
            + Create Role
          </Link>
        }
      />

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      <Card>
        {loading ? (
          <div className="p-10 text-center text-gray-400">Loading…</div>
        ) : roles.length === 0 ? (
          <EmptyState icon="🛡️" title="No roles yet" msg="Create a role to control access for your staff." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Name</th>
                  <th className="text-left px-4 py-3 font-semibold">Scope</th>
                  <th className="text-left px-4 py-3 font-semibold">Type</th>
                  <th className="text-left px-4 py-3 font-semibold">Permissions</th>
                  <th className="text-left px-4 py-3 font-semibold">Created</th>
                  <th className="text-right px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {roles.map((role) => (
                  <tr key={role.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{role.name}</div>
                      {role.description && <div className="text-xs text-gray-500 max-w-xs truncate">{role.description}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={role.tenantId ? 'indigo' : 'green'}>{role.tenantId ? 'Tenant' : 'Platform'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={role.isSystem ? 'amber' : 'gray'}>{role.isSystem ? 'System' : 'Custom'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{(role.permissions || []).length}</td>
                    <td className="px-4 py-3 text-gray-600">{new Date(role.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                      <button
                        onClick={() => setDetailRole(role)}
                        title="View permission matrix"
                        className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-indigo-300 text-indigo-600 hover:bg-indigo-50 text-xs font-bold"
                      >
                        i
                      </button>
                      <Link href={`/roles/${role.id}`} className="text-indigo-600 hover:text-indigo-800 font-semibold">
                        Edit
                      </Link>
                      {!role.isSystem && (
                        <button onClick={() => handleDelete(role)} className="text-red-600 hover:text-red-800">
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Role details modal — permission matrix */}
      {detailRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDetailRole(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900">{detailRole.name}</h3>
                <p className="text-sm text-gray-500">
                  {detailRole.description || 'No description'} · {detailRole.isSystem ? 'System role' : 'Custom role'}
                </p>
              </div>
              <button onClick={() => setDetailRole(null)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
            </div>
            <div className="p-6">
              <PermissionMatrix cells={expandPermissions(detailRole.permissions || [])} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
