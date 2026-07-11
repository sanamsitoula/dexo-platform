'use client';

/**
 * Onboarding for non-fitness verticals (salon, school, restaurant, generic).
 * Steps and preference options come from the vertical registry — nothing here
 * is hardcoded to a business type. Fitness tenants use FitnessOnboarding.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTenantInfo } from '../../lib/tenant-info';
import { resolveSubdomain } from '../../lib/api';

type Step = 'welcome' | 'profile' | 'preferences' | 'done';
const ORDER: Step[] = ['welcome', 'profile', 'preferences', 'done'];

export const onboardingKey = () => `dexo_onboarded_${resolveSubdomain()}`;

export default function GenericOnboarding() {
  const router = useRouter();
  const { info, vertical, primary } = useTenantInfo();
  const [step, setStep] = useState<Step>('welcome');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [prefs, setPrefs] = useState<string[]>([]);

  const idx = ORDER.indexOf(step);
  const next = () => setStep(ORDER[Math.min(idx + 1, ORDER.length - 1)]);
  const back = () => setStep(ORDER[Math.max(idx - 1, 0)]);
  const togglePref = (k: string) => setPrefs((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  function finish() {
    // Persist locally; synced to the vertical's profile API as those land.
    try {
      localStorage.setItem(onboardingKey(), JSON.stringify({ at: Date.now(), phone, address, preferences: prefs }));
    } catch { /* storage unavailable */ }
    router.replace('/');
  }

  const btn = 'w-full rounded-lg py-2.5 text-white font-semibold shadow transition hover:opacity-90';

  return (
    <div className="min-h-screen flex flex-col px-6 py-10">
      {/* Progress dots */}
      <div className="flex justify-center gap-2 mb-8">
        {ORDER.map((s, i) => (
          <span key={s} className="h-1.5 rounded-full transition-all duration-300"
            style={{ width: i === idx ? 24 : 8, backgroundColor: i <= idx ? primary : '#E5E7EB' }} />
        ))}
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto">
        {step === 'welcome' && (
          <div className="text-center">
            <div className="text-5xl">👋</div>
            <h1 className="mt-4 text-2xl font-bold text-gray-900">{vertical.onboardingWelcome}</h1>
            <p className="mt-2 text-gray-500 text-sm">
              Welcome to {info?.name || 'our'} — a couple of quick steps and you&apos;re all set.
            </p>
            <button onClick={next} className={`${btn} mt-8`} style={{ background: primary }}>Let&apos;s go</button>
          </div>
        )}

        {step === 'profile' && (
          <div>
            <h1 className="text-xl font-bold text-gray-900">Your contact details</h1>
            <p className="mt-1 text-gray-500 text-sm">So we can reach you about bookings and updates. Both optional.</p>
            <div className="mt-6 space-y-3">
              <input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5" />
              <input placeholder="Address / city" value={address} onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5" />
            </div>
            <div className="mt-8 flex gap-3">
              <button onClick={back} className="flex-1 rounded-lg py-2.5 border border-gray-300 font-semibold text-gray-600">Back</button>
              <button onClick={next} className={`flex-1 ${btn}`} style={{ background: primary }}>Continue</button>
            </div>
          </div>
        )}

        {step === 'preferences' && (
          <div>
            <h1 className="text-xl font-bold text-gray-900">{vertical.preferencesTitle}</h1>
            <p className="mt-1 text-gray-500 text-sm">Pick as many as you like — we&apos;ll personalise your experience.</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {vertical.preferences.map((p) => {
                const on = prefs.includes(p.key);
                return (
                  <button key={p.key} onClick={() => togglePref(p.key)}
                    className={`p-4 rounded-xl border-2 text-left transition ${on ? 'shadow' : 'border-gray-200'}`}
                    style={on ? { borderColor: primary, backgroundColor: `${primary}10` } : undefined}>
                    <span className="text-2xl">{p.icon}</span>
                    <span className="block mt-1 text-sm font-semibold text-gray-900">{p.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-8 flex gap-3">
              <button onClick={back} className="flex-1 rounded-lg py-2.5 border border-gray-300 font-semibold text-gray-600">Back</button>
              <button onClick={next} className={`flex-1 ${btn}`} style={{ background: primary }}>Continue</button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center">
            <div className="text-5xl">🎉</div>
            <h1 className="mt-4 text-2xl font-bold text-gray-900">You&apos;re all set!</h1>
            <p className="mt-2 text-gray-500 text-sm">
              Your {vertical.noun} account at {info?.name || 'our platform'} is ready.
            </p>
            <button onClick={finish} className={`${btn} mt-8`} style={{ background: primary }}>Go to my dashboard</button>
          </div>
        )}
      </div>
    </div>
  );
}
