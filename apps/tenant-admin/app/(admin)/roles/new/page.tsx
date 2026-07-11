'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { tenantRolesApi, tenantModulesApi } from '@/lib/api';
import { PageHeader, Card, Btn, Field, Input } from '../../_ui';
import PermissionMatrix from '@/components/PermissionMatrix';
import { PERMISSION_ACTIONS, compressPermissions, resourcesForModules } from '@/lib/permissions';

export default function NewRolePage() {
  const subdomain = (useParams()?.subdomain as string) || 'vrfitness';
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cells, setCells] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modules, setModules] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    tenantModulesApi.get(subdomain).then(setModules); // null on error → fail open
  }, [subdomain]);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const r = await tenantRolesApi.create(subdomain, {
      name,
      description,
      permissions: compressPermissions(cells),
    });
    if (r.error) {
      setError(r.error);
      setSaving(false);
    } else {
      router.push('/roles');
    }
  }

  return (
    <div>
      <PageHeader title="Create Role" subtitle="Define a custom role with granular permissions" />

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="p-6 max-w-4xl">
          <Field label="Role name *">
            <Input value={name} onChange={(e: any) => setName(e.target.value)} required placeholder="e.g. Front Desk" />
          </Field>
          <Field label="Description">
            <Input value={description} onChange={(e: any) => setDescription(e.target.value)} placeholder="What can this role do?" />
          </Field>
          <div className="mb-4">
            <span className="block text-sm font-semibold text-gray-700 mb-1.5">
              Permissions ({cells.size} selected)
            </span>
            <PermissionMatrix cells={cells} onToggle={toggleCell} onToggleRow={toggleRow} resources={resourcesForModules(modules)} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Btn variant="ghost" onClick={() => router.push('/roles')}>Cancel</Btn>
            <Btn type="submit" disabled={saving || !name.trim()}>
              {saving ? 'Creating…' : '+ Create Role'}
            </Btn>
          </div>
        </Card>
      </form>
    </div>
  );
}
