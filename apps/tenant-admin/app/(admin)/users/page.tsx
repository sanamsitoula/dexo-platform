'use client';

import { useEffect, useState } from 'react';
import { tenantUsersApi } from '@/lib/api';
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { PageHeader, Card, EmptyState, Badge } from '../_ui';

export default function UsersPage() {
  const subdomain = resolveTenantAdminSubdomain();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tenantUsersApi.list(subdomain).then((r) => {
      const list = Array.isArray(r.data) ? r.data : (r.data as any)?.items ?? (r.data as any)?.data ?? [];
      setUsers(list);
    }).finally(() => setLoading(false));
  }, [subdomain]);

  return (
    <div>
      <PageHeader title="Users" subtitle="Staff & members with login access to this gym" />
      <Card>
        {loading ? <div className="p-10 text-center text-gray-400">Loading…</div> : users.length === 0 ? (
          <EmptyState icon="👥" title="No users yet" msg="Owners, managers, trainers and members appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr><th className="text-left px-4 py-3 font-semibold">User</th><th className="text-left px-4 py-3 font-semibold">Email</th><th className="text-left px-4 py-3 font-semibold">Role</th><th className="text-left px-4 py-3 font-semibold">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => {
                  const name = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email;
                  const role = u.userRoles?.[0]?.role?.name || u.role || 'MEMBER';
                  return (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">{name.charAt(0).toUpperCase()}</div><span className="font-semibold text-gray-900">{name}</span></div></td>
                      <td className="px-4 py-3 text-gray-600">{u.email}</td>
                      <td className="px-4 py-3"><Badge color="indigo">{role}</Badge></td>
                      <td className="px-4 py-3"><Badge color={u.isActive === false ? 'gray' : 'green'}>{u.isActive === false ? 'Inactive' : 'Active'}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
