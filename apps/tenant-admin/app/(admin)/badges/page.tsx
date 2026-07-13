'use client';

import { useEffect, useState, useCallback } from 'react';
import { gymApi } from '@/lib/api';
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { PageHeader, Card, Btn, SlideOver, Field, Input, EmptyState, Badge } from '../_ui';

export default function BadgesPage() {
  const subdomain = resolveTenantAdminSubdomain();
  const [badges, setBadges] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [awardOpen, setAwardOpen] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', icon: '🏅', category: 'ACHIEVEMENT', points: 10, rewardNpr: '' });
  const [awardMemberId, setAwardMemberId] = useState('');

  const load = useCallback(async () => {
    const [b, m] = await Promise.all([gymApi.badges.list(subdomain), gymApi.members.list(subdomain)]);
    setBadges(Array.isArray(b.data) ? b.data : (b.data as any)?.items ?? []);
    setMembers(Array.isArray(m.data) ? m.data : (m.data as any)?.items ?? []);
    setLoading(false);
  }, [subdomain]);
  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true); setErr(null);
    const r = await gymApi.badges.create(subdomain, { ...form, points: Number(form.points), rewardNpr: form.rewardNpr ? Number(form.rewardNpr) : undefined, criteria: {} });
    setSaving(false);
    if (r.error) return setErr(r.error);
    setOpen(false); load();
  }

  async function award() {
    if (!awardOpen || !awardMemberId) return;
    setSaving(true); setErr(null);
    const r = await gymApi.badges.award(subdomain, { memberId: awardMemberId, badgeId: awardOpen });
    setSaving(false);
    if (r.error) return setErr(r.error);
    setAwardOpen(null); setAwardMemberId(''); load();
  }

  return (
    <div>
      <PageHeader title="Badges" subtitle="Achievements and rewards for members"
        action={<Btn onClick={() => setOpen(true)}>+ New badge</Btn>} />
      {loading ? <div className="text-gray-400">Loading…</div> : badges.length === 0 ? (
        <Card><EmptyState icon="🏅" title="No badges yet" msg="Create achievements for your members to earn." /></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {badges.map((b) => (
            <Card key={b.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="text-4xl">{b.icon ?? '🏅'}</div>
                <Badge color="indigo">{b.category}</Badge>
              </div>
              <div className="font-bold text-gray-900 mt-3">{b.name}</div>
              <div className="text-sm text-gray-500 mt-1">{b.description}</div>
              <div className="text-xs text-gray-400 mt-2">
                {b.points} pts{b.rewardNpr ? ` · NPR ${b.rewardNpr} reward` : ''}
                {b._count?.earnedBy != null ? ` · earned ${b._count.earnedBy}×` : ''}
              </div>
              <div className="mt-3"><Btn variant="outline" onClick={() => setAwardOpen(b.id)}>Award to member</Btn></div>
            </Card>
          ))}
        </div>
      )}

      <SlideOver open={open} onClose={() => setOpen(false)} title="New badge">
        <Field label="Name"><Input value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Description"><Input value={form.description} onChange={(e: any) => setForm({ ...form, description: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Icon (emoji)"><Input value={form.icon} onChange={(e: any) => setForm({ ...form, icon: e.target.value })} /></Field>
          <Field label="Points"><Input type="number" value={form.points} onChange={(e: any) => setForm({ ...form, points: e.target.value })} /></Field>
        </div>
        <Field label="Category">
          <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {['STREAK', 'MILESTONE', 'ACHIEVEMENT', 'CHALLENGE', 'SOCIAL'].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Cash reward NPR (optional)"><Input type="number" value={form.rewardNpr} onChange={(e: any) => setForm({ ...form, rewardNpr: e.target.value })} /></Field>
        {err && <p className="text-sm text-red-600 mb-3">{err}</p>}
        <Btn onClick={save} disabled={saving || !form.name}>{saving ? 'Saving…' : 'Create badge'}</Btn>
      </SlideOver>

      <SlideOver open={!!awardOpen} onClose={() => setAwardOpen(null)} title="Award badge">
        <Field label="Member">
          <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={awardMemberId} onChange={(e) => setAwardMemberId(e.target.value)}>
            <option value="">Select member…</option>
            {members.map((m: any) => <option key={m.id} value={m.id}>{m.user ? `${m.user.firstName ?? ''} ${m.user.lastName ?? ''}`.trim() || m.user.email : m.id.slice(0, 8)}</option>)}
          </select>
        </Field>
        {err && <p className="text-sm text-red-600 mb-3">{err}</p>}
        <Btn onClick={award} disabled={saving || !awardMemberId}>{saving ? 'Awarding…' : 'Award badge'}</Btn>
      </SlideOver>
    </div>
  );
}
