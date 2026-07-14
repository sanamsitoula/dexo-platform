'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fitnessApi, publicApi } from '../../lib/api';

type Tab = 'all' | 'trainers' | 'plans';

export default function ExplorePage() {
  const [info, setInfo] = useState<any>(null);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('all');

  useEffect(() => {
    (async () => {
      const [i, t, p] = await Promise.all([publicApi.info(), fitnessApi.trainers(), fitnessApi.plans()]);
      if (i.data) setInfo(i.data);
      setTrainers(Array.isArray(t.data) ? t.data : (t.data as any)?.items ?? []);
      setPlans(Array.isArray(p.data) ? p.data : (p.data as any)?.items ?? []);
      setLoading(false);
    })();
  }, []);

  const primary = info?.colorPrimary || '#E85D24';

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;

  const showTrainers = tab === 'all' || tab === 'trainers';
  const showPlans = tab === 'all' || tab === 'plans';

  return (
    <div className="px-4 py-6 pb-24">
      <h1 className="text-2xl font-extrabold text-gray-900 px-2 -tracking-tight">Explore</h1>
      <p className="text-gray-500 px-2 mt-1 text-sm">Meet the trainers and browse plans at {info?.name || 'your gym'}.</p>

      <div className="mt-5 flex gap-2 px-2">
        {(['all', 'trainers', 'plans'] as Tab[]).map((k) => {
          const active = tab === k;
          return (
            <button
              key={k}
              onClick={() => setTab(k)}
              className="px-4 py-2 rounded-full text-sm font-bold transition"
              style={active ? { background: primary, color: '#fff' } : { background: '#fff', color: '#6B7280', border: '1px solid #E5E7EB' }}
            >
              {k === 'all' ? 'All' : k === 'trainers' ? 'Trainers' : 'Plans'}
            </button>
          );
        })}
      </div>

      {showTrainers && (
        <>
          <h2 className="mt-6 px-2 font-extrabold text-gray-900">Trainers</h2>
          {trainers.length === 0 ? (
            <div className="mt-2 rounded-3xl border border-dashed border-gray-300 p-8 text-center">
              <div className="text-4xl">🧑‍🏫</div>
              <p className="mt-2 text-sm text-gray-500">No trainers published yet.</p>
            </div>
          ) : (
            <div className="mt-2 space-y-3">
              {trainers.map((t) => {
                const name = t.name || `${t.user?.firstName ?? ''} ${t.user?.lastName ?? ''}`.trim() || 'Trainer';
                const avatar = t.user?.avatarUrl;
                return (
                  <div key={t.id} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
                    {avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatar} alt="" className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0" style={{ background: primary }}>
                        {name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-gray-900 truncate">{name}</div>
                      {t.specialization && <div className="text-sm font-semibold mt-0.5" style={{ color: primary }}>{t.specialization}</div>}
                      {t.bio && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{t.bio}</p>}
                      {t.branch?.name && <div className="text-xs text-gray-400 mt-1">📍 {t.branch.name}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {showPlans && (
        <>
          <h2 className="mt-6 px-2 font-extrabold text-gray-900">Plans</h2>
          {plans.length === 0 ? (
            <div className="mt-2 rounded-3xl border border-dashed border-gray-300 p-8 text-center">
              <div className="text-4xl">📋</div>
              <p className="mt-2 text-sm text-gray-500">No plans published yet.</p>
            </div>
          ) : (
            <div className="mt-2 space-y-3">
              {plans.map((p) => (
                <div key={p.id} className="rounded-3xl border p-5 bg-white" style={{ borderColor: '#EAECEF' }}>
                  <div className="flex justify-between items-center">
                    <div className="font-extrabold text-gray-900">{p.name}</div>
                    <div className="font-extrabold" style={{ color: primary }}>NPR {p.totalWithVat ?? p.priceNpr}</div>
                  </div>
                  {p.description && <p className="text-xs text-gray-500 mt-1">{p.description}</p>}
                  <div className="flex flex-wrap gap-2 mt-3 text-xs text-gray-600 font-semibold">
                    <span className="bg-gray-100 px-2.5 py-1 rounded-full">📅 {p.durationDays}d</span>
                    {p.includesTrainer && <span className="bg-gray-100 px-2.5 py-1 rounded-full">Trainer</span>}
                    {p.includesClasses && <span className="bg-gray-100 px-2.5 py-1 rounded-full">Classes</span>}
                    {p.includesDietPlan && <span className="bg-gray-100 px-2.5 py-1 rounded-full">Diet plan</span>}
                  </div>
                </div>
              ))}
              <Link href="/membership" className="block text-center rounded-full py-3 text-white font-bold mt-2" style={{ background: primary }}>
                Go to Membership to subscribe →
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
