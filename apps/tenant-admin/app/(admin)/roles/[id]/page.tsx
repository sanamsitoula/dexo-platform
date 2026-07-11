'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { tenantRolesApi } from '@/lib/api';
import { PageHeader, Card, Btn, Field, Input, Badge } from '../../_ui';
import PermissionMatrix from '@/components/PermissionMatrix';
import { PERMISSION_ACTIONS, expandPermissions, compressPermissions } from '@/lib/permissions';

interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  tenantId?: string | null;
  permissions: string[];
  createdAt: string;
  _count?: { userRoles?: number };
}

export default function RoleDetailPage() {
  const params = useParams<{ id: string; subdomain?: string }>();
  const id = params?.id;
  const subdomain = (params?.subdomain as string) || 'vrfitness';
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cells, setCells] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchRole(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, subdomain]);

  async function fetchRole(roleId: string) {
    setLoading(true);
    const r = await tenantRolesApi.getById(subdomain, roleId);
    if (r.data) {
      setRole(r.data);
      setName(r.data.name);
      setDescription(r.data.description || '');
      setCells(expandPermissions(r.data.permissions || []));
    } else if (r.error) {
      setError(r.error);
    }
    setLoading(false);
  }

  function toggleCell(resource: string, action: string) {
    setCells((prev) => {
      const next = new Set(prev);
      const key = `${resource}:${action}`;
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleRow(resource: string) {
    setCells((prev) => {
      const next = new Set(prev);
      const allSelected = PERMISSION_ACTIONS.every((a) => next.has(`${resource}:${a}`));
      for (const a of PERMISSION_ACTIONS) {
        if (allSelected) next.delete(`${resource}:${a}`);
        else next.add(`${resource}:${a}`);
      }
      return next;
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!role) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    const payload: any = { name, description };
    if (!role.isSystem) payload.permissions = compressPermissions(cells);
    const r = await tenantRolesApi.update(subdomain, role.id, payload);
    if (r.error) {
      setError(r.error);
    } else {
      setSuccess('Role updated successfully');
      setTimeout(() => setSuccess(null), 3000);
      fetchRole(role.id);
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!role) return;
    if (!confirm(`Delete role "${role.name}"? This cannot be undone.`)) return;
    const r = await tenantRolesApi.delete(subdomain, role.id);
    if (r.error) alert(r.error);
    else router.push('/roles');
  }

  if (loading) return <div className="p-10 text-center text-gray-400">Loading…</div>;

  if (!role) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Role not found</p>
        {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
        <a href="/roles" className="text-indigo-600 hover:text-indigo-700 mt-2 inline-block">← Back to roles</a>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={role.name}
        subtitle={role.description || 'No description'}
        action={
          <div className="flex items-center gap-2">
            <Badge color={role.isSystem ? 'amber' : 'gray'}>{role.isSystem ? 'System' : 'Custom'}</Badge>
            {!role.isSystem && (
              <Btn variant="outline" onClick={handleDelete}>Delete</Btn>
            )}
          </div>
        }
      />

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">✓ {success}</div>
      )}

      <form onSubmit={handleSave}>
        <Card className="p-6 max-w-4xl">
          <Field label="Role name *">
            <Input value={name} onChange={(e: any) => setName(e.target.value)} required />
          </Field>
          <Field label="Description">
            <Input value={description} onChange={(e: any) => setDescription(e.target.value)} placeholder="What can this role do?" />
          </Field>

          <div className="mb-4">
            <span className="block text-sm font-semibold text-gray-700 mb-1.5">
              Permissions ({cells.size} granted)
            </span>
            <PermissionMatrix
              cells={cells}
              onToggle={role.isSystem ? undefined : toggleCell}
              onToggleRow={role.isSystem ? undefined : toggleRow}
            />
            {role.isSystem && (
              <p className="text-xs text-gray-500 italic mt-2">
                System role permissions are managed by the platform and cannot be modified.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Btn variant="ghost" onClick={() => router.push('/roles')}>Back</Btn>
            <Btn type="submit" disabled={saving || !name.trim()}>
              {saving ? 'Saving…' : 'Save Changes'}
            </Btn>
          </div>
        </Card>
      </form>
    </div>
  );
}
