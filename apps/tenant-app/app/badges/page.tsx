'use client';

import { useEffect, useState } from 'react';
import { fitnessApi, publicApi } from '../../lib/api';

export default function BadgesPage() {
  const [info, setInfo] = useState<any>(null);
  const [all, setAll] = useState<any[]>([]);
  const [earned, setEarned] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [i, m, b] = await Promise.all([publicApi.info(), fitnessApi.me(), fitnessApi.badges.all()]);
      setInfo(i.data);
      setAll(Array.isArray(b.data) ? b.data : (b.data as any)?.items ?? []);
      if (m.data?.id) {
        const e = await fitnessApi.badges.memberBadges(m.data.id).catch(() => ({ data: [] as any[] }));
        setEarned(Array.isArray(e.data) ? e.data : (e.data as any)?.items ?? []);
      }
      setLoading(false);
    })();
  }, []);

  const primary = info?.colorPrimary || '#E85D24';
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;

  const earnedIds = new Set(earned.map((e) => e.badgeId ?? e.badge?.id));
  const points = earned.reduce((sum, e) => sum + (e.badge?.points ?? 0), 0);

  return (
    <div className="px-4 py-6 pb-24">
      <h1 className="text-2xl font-extrabold text-gray-900 px-2 -tracking-tight">Achievements</h1>
      <p className="text-sm text-gray-500 px-2 mt-1">Badges you've earned and what's still up for grabs.</p>

      <div className="mt-4 rounded-3xl p-6 text-white shadow-lg" style={{ background: primary }}>
        <div className="text-xs font-extrabold tracking-widest opacity-90">YOUR TROPHY CASE</div>
        <div className="flex gap-8 mt-3">
          <div><div className="text-3xl font-extrabold">{earned.length}</div><div className="text-xs opacity-90">badges earned</div></div>
          <div><div className="text-3xl font-extrabold">{points}</div><div className="text-xs opacity-90">points collected</div></div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {all.map((b) => {
          const got = earnedIds.has(b.id);
          const when = earned.find((e) => (e.badgeId ?? e.badge?.id) === b.id)?.earnedAt;
          return (
            <div key={b.id} className={`rounded-3xl border p-4 flex flex-col items-center text-center ${got ? 'bg-white border-gray-100 shadow-sm' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl" style={{ background: got ? primary + '15' : '#E5E7EB' }}>
                {got ? (b.icon ?? '🏅') : '🔒'}
              </div>
              <div className="text-xs font-bold text-gray-900 mt-2 leading-tight">{b.name}</div>
              <div className="text-[10px] text-gray-500 mt-1 leading-tight">{got && when ? new Date(when).toLocaleDateString([], { month: 'short', day: 'numeric' }) : b.description}</div>
              <div className="text-[10px] font-bold mt-1" style={{ color: primary }}>{b.points} pts{b.rewardNpr ? ` · NPR ${b.rewardNpr}` : ''}</div>
            </div>
          );
        })}
      </div>
      {all.length === 0 && (
        <div className="text-center py-10">
          <div className="text-5xl">🏅</div>
          <p className="text-sm text-gray-500 mt-3">No badges configured yet — check back soon.</p>
        </div>
      )}
    </div>
  );
}
