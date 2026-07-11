'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { fitnessApi, publicApi } from '../../lib/api';
import { Ring } from './ui';

const WEEKLY_GOAL = 4;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function FitnessHome() {
  const router = useRouter();
  const { user } = useAuth();
  const [info, setInfo] = useState<any>(null);
  const [member, setMember] = useState<any>(null);
  const [pending, setPending] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [i, m] = await Promise.all([publicApi.info(), fitnessApi.me()]);
      setInfo(i.data);
      const mem = m.data;
      setMember(mem);
      if (mem && !mem.goals && mem.status === 'PENDING_VERIFICATION') {
        router.replace('/onboarding');
        return;
      }
      if (mem?.id) {
        const [ms, wp, st] = await Promise.all([
          fitnessApi.memberships.list(mem.id),
          fitnessApi.workoutPlans(mem.id),
          fitnessApi.workoutLogs.stats(mem.id).catch(() => ({ data: null })),
        ]);
        const list = Array.isArray(ms.data) ? ms.data : ms.data?.items ?? [];
        setPending(list.find((x: any) => String(x.status).toUpperCase() === 'PENDING') || null);
        const plans = Array.isArray(wp.data) ? wp.data : wp.data?.items ?? [];
        setPlan(plans[0] || null);
        if (st.data) setStats(st.data);
      }
      setLoading(false);
    })();
  }, [router]);

  const primary = info?.colorPrimary || '#E85D24';
  const active = member?.memberships?.[0];
  const thisWeek = stats?.thisWeek ?? 0;
  const weekProgress = Math.min(1, thisWeek / WEEKLY_GOAL);
  const daysLeft = active?.endDate ? Math.max(0, Math.ceil((new Date(active.endDate).getTime() - Date.now()) / 86400000)) : null;

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;

  return (
    <div className="pb-6">
      {/* Greeting */}
      <div className="px-6 pt-10 pb-4 flex items-start justify-between">
        <div>
          <div className="text-gray-500 font-semibold">{greeting()},</div>
          <div className="text-3xl font-extrabold text-gray-900 -tracking-tight">{user?.firstName || 'Athlete'} 👋</div>
          <div className="text-sm text-gray-500 mt-1">{stats?.streak ? `You’re on a ${stats.streak}-day streak. Keep it alive.` : 'Let’s make today count.'}</div>
        </div>
        <Link href="/account" aria-label="My profile" className="mt-1 w-11 h-11 rounded-full flex items-center justify-center text-white font-bold shadow-sm" style={{ background: primary }}>
          {(user?.firstName || user?.email || 'U').charAt(0).toUpperCase()}
        </Link>
      </div>

      <div className="px-4 space-y-4">
        {/* Today's workout hero */}
        <Link href="/workouts" className="block rounded-[28px] p-6 text-white shadow-lg active:scale-[.99] transition" style={{ background: primary }}>
          <div className="text-xs font-extrabold tracking-widest opacity-90">TODAY’S WORKOUT</div>
          <div className="text-2xl font-extrabold mt-1">{plan?.name || plan?.title || 'Full Body Strength'}</div>
          <div className="flex gap-4 mt-3 text-sm opacity-95">
            <span>⏱ {plan?.durationMin || 45} min</span>
            <span>🔥 {plan?.difficulty || 'Intermediate'}</span>
            <span>🏋 {plan?.exercises?.length || 6} exercises</span>
          </div>
          <div className="bg-white rounded-full py-3 mt-5 text-center font-extrabold" style={{ color: primary }}>Start workout ▶</div>
        </Link>

        {/* Weekly progress */}
        <div className="rounded-3xl bg-white border border-gray-100 shadow-sm p-5 flex items-center gap-5">
          <Ring size={104} stroke={11} progress={weekProgress} color={primary}>
            <div className="text-lg font-extrabold text-gray-900">{thisWeek}/{WEEKLY_GOAL}</div>
            <div className="text-[11px] text-gray-500">this week</div>
          </Ring>
          <div className="flex-1 space-y-2">
            <Metric icon="🔥" value={stats?.streak ?? 0} label="day streak" />
            <Metric icon="🏋" value={stats?.totalWorkouts ?? stats?.total ?? 0} label="total sessions" />
            <Metric icon="⚡" value={stats?.totalCalories ?? 0} label="kcal burned" />
          </div>
        </div>

        {/* Membership */}
        {active ? (
          <Link href="/membership" className="block rounded-3xl bg-white border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-gray-900">{active.plan?.name}</div>
                <div className="text-sm text-gray-500">{daysLeft != null ? `${daysLeft} days remaining` : String(active.status || '').toLowerCase()}</div>
              </div>
              <span className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: primary + '15', color: primary }}>💳</span>
            </div>
          </Link>
        ) : (
          <Link href="/membership" className="block rounded-3xl border border-dashed border-gray-300 p-5 text-center text-gray-600">
            No active membership — <span className="font-semibold" style={{ color: primary }}>choose a plan →</span>
          </Link>
        )}

        {pending && (
          <div className="rounded-3xl bg-amber-50 border border-amber-200 p-4 flex items-center justify-between">
            <div>
              <div className="font-semibold text-amber-900">Payment due</div>
              <div className="text-sm text-amber-700">NPR {pending.amountPaid ?? pending.plan?.totalWithVat} · {pending.plan?.name}</div>
            </div>
            <Link href="/membership" className="rounded-full px-5 py-2 text-white text-sm font-bold" style={{ background: primary }}>Pay</Link>
          </div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-4 gap-3">
          <Quick href="/membership" icon="📷" label="Check in" primary={primary} />
          <Quick href="/workouts" icon="🏋️" label="Train" primary={primary} />
          <Quick href="/diet" icon="🥗" label="Nutrition" primary={primary} />
          <Quick href="/progress" icon="📈" label="Progress" primary={primary} />
          <Quick href="/coach" icon="💬" label="Coach" primary={primary} />
          <Quick href="/badges" icon="🏅" label="Badges" primary={primary} />
          <Quick href="/referrals" icon="🤝" label="Refer" primary={primary} />
          <Quick href="/bookings" icon="🗓️" label="Classes" primary={primary} />
        </div>
      </div>
    </div>
  );
}

function Metric({ icon, value, label }: any) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-lg">{icon}</span>
      <div>
        <div className="font-extrabold text-gray-900 leading-none">{value}</div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
    </div>
  );
}

function Quick({ href, icon, label, primary }: any) {
  return (
    <Link href={href} className="flex flex-col items-center">
      <span className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl" style={{ background: primary + '15' }}>{icon}</span>
      <span className="text-xs text-gray-700 mt-1.5 font-semibold">{label}</span>
    </Link>
  );
}
