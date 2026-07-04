'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth';
import { fitnessApi, publicApi } from '../lib/api';

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const [info, setInfo] = useState<any>(null);
  const [member, setMember] = useState<any>(null);
  const [pending, setPending] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [i, m] = await Promise.all([publicApi.info(), fitnessApi.me()]);
      setInfo(i.data);
      const mem = m.data;
      setMember(mem);
      // New members with no profile → onboarding.
      if (mem && !mem.goals && mem.status === 'PENDING_VERIFICATION') {
        router.replace('/onboarding');
        return;
      }
      if (mem?.id) {
        const ms = await fitnessApi.memberships.list(mem.id);
        const list = Array.isArray(ms.data) ? ms.data : ms.data?.items ?? [];
        setPending(list.find((x: any) => x.status === 'PENDING') || null);
      }
      setLoading(false);
    })();
  }, [router]);

  const primary = info?.colorPrimary || '#E85D24';
  const active = member?.memberships?.[0];

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;

  return (
    <div>
      <div className="px-6 py-8 text-white" style={{ background: primary }}>
        <div className="text-sm opacity-90">Welcome back</div>
        <div className="text-2xl font-bold">Hi {user?.firstName || 'there'} 👋</div>
        <div className="text-sm opacity-90 mt-1">{info?.name}</div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {active ? (
          <div className="rounded-xl p-4 text-white" style={{ background: primary }}>
            <div className="text-xs opacity-80 uppercase">Current Plan</div>
            <div className="text-lg font-bold">{active.plan?.name}</div>
            <div className="text-sm opacity-90 mt-1">Valid until {active.endDate ? new Date(active.endDate).toLocaleDateString() : '—'}</div>
          </div>
        ) : (
          <Link href="/membership" className="block rounded-xl border border-dashed border-gray-300 p-4 text-center text-gray-600">
            No active membership — <span className="font-semibold" style={{ color: primary }}>choose a plan →</span>
          </Link>
        )}

        {pending && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-center justify-between">
            <div>
              <div className="font-semibold text-amber-900">Payment due</div>
              <div className="text-sm text-amber-700">NPR {pending.amountPaid ?? pending.plan?.totalWithVat} · {pending.plan?.name}</div>
            </div>
            <Link href="/membership" className="rounded-lg px-4 py-2 text-white text-sm font-semibold" style={{ background: primary }}>Pay</Link>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Link href="/workouts" className="rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-2xl">🏋️</div><div className="mt-1 text-sm font-semibold text-gray-800">Workouts</div>
          </Link>
          <Link href="/diet" className="rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-2xl">🥗</div><div className="mt-1 text-sm font-semibold text-gray-800">Log Food</div>
          </Link>
          <Link href="/membership" className="rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-2xl">💳</div><div className="mt-1 text-sm font-semibold text-gray-800">Membership</div>
          </Link>
          <Link href="/account" className="rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-2xl">👤</div><div className="mt-1 text-sm font-semibold text-gray-800">Account</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
