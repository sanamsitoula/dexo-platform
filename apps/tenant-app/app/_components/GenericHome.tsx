'use client';

/**
 * Dashboard for non-fitness verticals — driven entirely by the vertical
 * registry (quick actions, copy) and tenant branding. As per-vertical customer
 * APIs land (salon appointments, school results, restaurant orders), their
 * widgets slot in here behind the same vertical switch.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { useTenantInfo } from '../../lib/tenant-info';
import { onboardingKey } from '../onboarding/GenericOnboarding';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function GenericHome() {
  const router = useRouter();
  const { user } = useAuth();
  const { info, vertical, primary, accent } = useTenantInfo();
  const [prefs, setPrefs] = useState<string[]>([]);

  useEffect(() => {
    // First visit → run the vertical's onboarding once.
    try {
      const raw = localStorage.getItem(onboardingKey());
      if (!raw) {
        router.replace('/onboarding');
        return;
      }
      const saved = JSON.parse(raw);
      if (Array.isArray(saved?.preferences)) setPrefs(saved.preferences);
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prefLabels = vertical.preferences.filter((p) => prefs.includes(p.key));

  return (
    <div className="pb-24">
      {/* Hero */}
      <div className="px-5 pt-10 pb-8 text-white" style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}>
        <p className="text-sm opacity-80">{greeting()},</p>
        <h1 className="text-2xl font-bold">{user?.firstName || vertical.noun}</h1>
        <p className="mt-1 text-sm opacity-80">Welcome to {info?.name || 'your portal'}</p>
      </div>

      {/* Quick actions from the vertical registry */}
      <div className="px-5 -mt-5">
        <div className="grid grid-cols-2 gap-3">
          {vertical.quickActions.map((a) => (
            <Link key={a.href} href={a.href}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition">
              <span className="text-2xl">{a.icon}</span>
              <span className="block mt-2 font-semibold text-gray-900 text-sm">{a.label}</span>
              <span className="block text-xs text-gray-500">{a.desc}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Your interests */}
      {prefLabels.length > 0 && (
        <div className="px-5 mt-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Your interests</h2>
          <div className="flex flex-wrap gap-2">
            {prefLabels.map((p) => (
              <span key={p.key} className="px-3 py-1.5 rounded-full text-xs font-medium"
                style={{ backgroundColor: `${primary}15`, color: primary }}>
                {p.icon} {p.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notifications / referrals shortcuts */}
      <div className="px-5 mt-6 space-y-3">
        <Link href="/bookings" className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition">
          <span className="text-xl">🗓️</span>
          <span className="flex-1">
            <span className="block text-sm font-semibold text-gray-900">Make a booking</span>
            <span className="block text-xs text-gray-500">Reserve your next visit at {info?.name || 'us'}</span>
          </span>
          <span className="text-gray-300">›</span>
        </Link>
        <Link href="/referrals" className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition">
          <span className="text-xl">🎁</span>
          <span className="flex-1">
            <span className="block text-sm font-semibold text-gray-900">Refer a friend</span>
            <span className="block text-xs text-gray-500">Share {info?.name || 'us'} and earn rewards</span>
          </span>
          <span className="text-gray-300">›</span>
        </Link>
      </div>
    </div>
  );
}
