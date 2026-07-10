'use client';

import { useEffect, useState } from 'react';
import { fitnessApi, publicApi } from '../../lib/api';
import { Ring } from '../_components/ui';

const WEEKLY_GOAL = 4;

export default function ProgressPage() {
  const [info, setInfo] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [i, m] = await Promise.all([publicApi.info(), fitnessApi.me()]);
      setInfo(i.data);
      if (m.data?.id) {
        const [s, a, b] = await Promise.all([
          fitnessApi.workoutLogs.stats(m.data.id).catch(() => ({ data: null })),
          fitnessApi.assessments.progress(m.data.id).catch(() => ({ data: [] })),
          fitnessApi.badges.memberBadges(m.data.id).catch(() => ({ data: [] })),
        ]);
        if (s.data) setStats(s.data);
        setAssessments(Array.isArray(a.data) ? a.data : (a.data as any)?.items ?? []);
        setBadges(Array.isArray(b.data) ? b.data : (b.data as any)?.items ?? []);
      }
      setLoading(false);
    })();
  }, []);

  const primary = info?.colorPrimary || '#E85D24';
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;

  const thisWeek = stats?.thisWeek ?? 0;
  const weekProgress = Math.min(1, thisWeek / WEEKLY_GOAL);
  const sorted = [...assessments].sort((x, y) => new Date(x.assessedAt).getTime() - new Date(y.assessedAt).getTime());
  const latest = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];
  const weights = sorted.map((a) => Number(a.weight)).filter((n) => !isNaN(n));
  const wMin = Math.min(...weights), wMax = Math.max(...weights), wRange = wMax - wMin || 1;
  const delta = latest && prev && latest.weight && prev.weight ? Number(latest.weight) - Number(prev.weight) : null;

  return (
    <div className="px-4 py-6 pb-24">
      <h1 className="text-2xl font-extrabold text-gray-900 px-2 -tracking-tight">Your progress</h1>
      <p className="text-sm text-gray-500 px-2 mt-1">Everything you’ve earned so far.</p>

      {/* Weekly ring */}
      <div className="mt-4 rounded-3xl bg-white border border-gray-100 shadow-sm p-5 flex items-center gap-5">
        <Ring size={116} stroke={12} progress={weekProgress} color={primary}>
          <div className="text-lg font-extrabold text-gray-900">{thisWeek}/{WEEKLY_GOAL}</div>
          <div className="text-[11px] text-gray-500">this week</div>
        </Ring>
        <div className="flex-1 space-y-3">
          <M icon="🔥" value={stats?.streak ?? 0} label="day streak" />
          <M icon="⏱" value={stats?.totalMinutes ?? 0} label="total minutes" />
          <M icon="⚡" value={stats?.totalCalories ?? 0} label="calories burned" />
        </div>
      </div>

      {/* Body composition */}
      <div className="mt-4 rounded-3xl bg-white border border-gray-100 shadow-sm p-5">
        <div className="font-extrabold text-gray-900">Body composition</div>
        {latest ? (
          <div className="grid grid-cols-4 gap-2 mt-4 text-center">
            <Comp value={latest.weight ?? '—'} unit="kg" label="Weight" delta={delta} />
            <Comp value={latest.bmi ?? '—'} unit="" label="BMI" />
            <Comp value={latest.bodyFatPercent ?? '—'} unit="%" label="Body fat" />
            <Comp value={latest.muscleMass ?? '—'} unit="kg" label="Muscle" />
          </div>
        ) : <p className="text-sm text-gray-500 mt-2">No measurements yet — your trainer will record these.</p>}
      </div>

      {/* Weight trend */}
      {weights.length >= 2 && (
        <div className="mt-4 rounded-3xl bg-white border border-gray-100 shadow-sm p-5">
          <div className="font-extrabold text-gray-900">Weight trend</div>
          <div className="flex items-end gap-1 h-24 mt-4">
            {weights.map((v, i) => (
              <div key={i} className="flex-1 flex justify-center items-end">
                <div className="w-3/5 rounded" style={{ height: `${12 + ((v - wMin) / wRange) * 68}%`, background: primary, opacity: 0.35 + (i / weights.length) * 0.65 }} />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{new Date(sorted[0].assessedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
            <span>{new Date(latest.assessedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
          </div>
        </div>
      )}

      {/* Achievements */}
      <div className="mt-4 rounded-3xl bg-white border border-gray-100 shadow-sm p-5">
        <div className="font-extrabold text-gray-900">Achievements</div>
        {badges.length === 0 ? (
          <div className="text-center py-4"><div className="text-4xl">🏅</div><p className="text-sm text-gray-500 mt-1">Your first badge is one workout away.</p></div>
        ) : (
          <div className="grid grid-cols-3 gap-3 mt-4">
            {badges.slice(0, 9).map((b) => (
              <div key={b.id} className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl" style={{ background: primary + '12' }}>{b.badge?.icon ?? '🏆'}</div>
                <div className="text-xs text-gray-700 mt-1.5 font-semibold text-center truncate w-full">{b.badge?.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function M({ icon, value, label }: any) {
  return <div className="flex items-center gap-2"><span className="text-lg">{icon}</span><div><div className="font-extrabold text-gray-900 leading-none">{value}</div><div className="text-xs text-gray-500">{label}</div></div></div>;
}
function Comp({ value, unit, label, delta }: any) {
  return (
    <div>
      <div className="text-xl font-extrabold text-gray-900">{value}<span className="text-sm text-gray-500 font-semibold">{unit}</span></div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
      {delta != null && delta !== 0 && <div className={`text-xs font-bold mt-0.5 ${delta < 0 ? 'text-green-600' : 'text-amber-600'}`}>{delta < 0 ? '▼' : '▲'} {Math.abs(delta).toFixed(1)}</div>}
    </div>
  );
}
