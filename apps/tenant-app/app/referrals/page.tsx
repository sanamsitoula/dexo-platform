'use client';

import { useEffect, useState, useCallback } from 'react';
import { fitnessApi, publicApi } from '../../lib/api';

const statusStyle: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  ACCEPTED: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  EXPIRED: 'bg-gray-100 text-gray-500',
};

export default function ReferralsPage() {
  const [info, setInfo] = useState<any>(null);
  const [member, setMember] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [email, setEmail] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async (memberId: string) => {
    const r = await fitnessApi.referrals.mine(memberId);
    setReferrals(Array.isArray(r.data) ? r.data : (r.data as any)?.items ?? []);
  }, []);

  useEffect(() => {
    (async () => {
      const [i, m] = await Promise.all([publicApi.info(), fitnessApi.me()]);
      setInfo(i.data);
      setMember(m.data);
      if (m.data?.id) await load(m.data.id);
      setLoading(false);
    })();
  }, [load]);

  async function invite() {
    if (!member?.id) return;
    setCreating(true);
    const r = await fitnessApi.referrals.create({ referrerId: member.id, refereeEmail: email || undefined });
    setCreating(false);
    if (!r.error) { setEmail(''); load(member.id); }
  }

  function copy(code: string) {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(code);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  const primary = info?.colorPrimary || '#E85D24';
  const completed = referrals.filter((r) => r.status === 'COMPLETED').length;
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;

  return (
    <div className="px-4 py-6 pb-24">
      <h1 className="text-2xl font-extrabold text-gray-900 px-2 -tracking-tight">Refer a friend</h1>
      <p className="text-sm text-gray-500 px-2 mt-1">Share the gym, earn rewards when they join.</p>

      <div className="mt-4 rounded-3xl p-6 text-white shadow-lg" style={{ background: primary }}>
        <div className="text-xs font-extrabold tracking-widest opacity-90">YOUR IMPACT</div>
        <div className="flex gap-8 mt-3">
          <div><div className="text-3xl font-extrabold">{referrals.length}</div><div className="text-xs opacity-90">invites sent</div></div>
          <div><div className="text-3xl font-extrabold">{completed}</div><div className="text-xs opacity-90">friends joined</div></div>
        </div>
      </div>

      <div className="mt-4 rounded-3xl bg-white border border-gray-100 shadow-sm p-5">
        <div className="font-extrabold text-gray-900">Invite someone</div>
        <div className="flex gap-2 mt-3">
          <input
            className="flex-1 rounded-full border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-gray-400"
            placeholder="Friend's email (optional)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button onClick={invite} disabled={creating} className="rounded-full px-5 py-2.5 text-white text-sm font-bold disabled:opacity-40" style={{ background: primary }}>
            {creating ? '…' : 'Get code'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">A unique code is created — share it with your friend to use when signing up.</p>
      </div>

      <div className="mt-4 space-y-3">
        {referrals.map((r) => (
          <div key={r.id} className="rounded-3xl bg-white border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <button onClick={() => copy(r.referralCode)} className="font-mono font-bold text-gray-900 text-sm">
                {r.referralCode} {copied === r.referralCode ? '✓ copied' : '⧉'}
              </button>
              <div className="text-xs text-gray-500 truncate">
                {r.referee?.user ? `${r.referee.user.firstName ?? ''} ${r.referee.user.lastName ?? ''}`.trim() : r.refereeEmail ?? 'Not shared yet'}
                {r.rewardType ? ` · ${String(r.rewardType).replace(/_/g, ' ').toLowerCase()} ${r.rewardValue ?? ''}` : ''}
              </div>
            </div>
            <span className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold ${statusStyle[r.status] ?? 'bg-gray-100 text-gray-500'}`}>{r.status}</span>
          </div>
        ))}
        {referrals.length === 0 && (
          <div className="text-center py-10">
            <div className="text-5xl">🤝</div>
            <p className="text-sm text-gray-500 mt-3">No invites yet — create your first referral code above.</p>
          </div>
        )}
      </div>
    </div>
  );
}
