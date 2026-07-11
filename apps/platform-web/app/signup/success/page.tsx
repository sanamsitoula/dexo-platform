'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const CONFETTI_COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#EF4444'];

export default function SignupSuccess() {
  const params = useSearchParams();
  const sub = params?.get('sub') || 'your-tenant';
  const tenantId = params?.get('tenant') || '';
  const [copied, setCopied] = useState<string | null>(null);

  // One-time confetti burst, pure CSS — no external deps.
  const confetti = useMemo(
    () =>
      [...Array(40)].map((_, i) => ({
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 1.2}s`,
        duration: `${2.2 + Math.random() * 1.8}s`,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rotate: Math.random() * 360,
        size: 6 + Math.random() * 6,
      })),
    [],
  );
  const [showConfetti, setShowConfetti] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(t);
  }, []);

  const adminUrl = `http://admin.${sub}.onedexo.com:4006/login`;
  const siteUrl = `http://${sub}.onedexo.com:4005`;

  function copy(label: string, value: string) {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-blue-50 px-4 py-10 relative overflow-hidden">
      <style jsx global>{`
        @keyframes confettiFall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        @keyframes popIn {
          0% { transform: scale(0.6); opacity: 0; }
          70% { transform: scale(1.08); }
          100% { transform: scale(1); opacity: 1; }
        }
        .pop-in { animation: popIn 0.5s ease-out; }
      `}</style>

      {showConfetti && (
        <div className="pointer-events-none fixed inset-0 z-10">
          {confetti.map((c, i) => (
            <span
              key={i}
              className="absolute top-0 rounded-sm"
              style={{
                left: c.left,
                width: c.size,
                height: c.size * 0.6,
                backgroundColor: c.color,
                transform: `rotate(${c.rotate}deg)`,
                animation: `confettiFall ${c.duration} ease-in ${c.delay} forwards`,
              }}
            />
          ))}
        </div>
      )}

      <div className="max-w-lg w-full bg-white shadow-2xl rounded-2xl p-8 text-center relative z-20 pop-in">
        <div className="mx-auto h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center text-4xl">
          🎉
        </div>
        <h1 className="mt-4 text-3xl font-bold text-gray-900">Your business is live!</h1>
        <p className="mt-2 text-gray-600">
          <span className="font-mono font-semibold">{sub}.onedexo.com</span> is published — website, admin console and workspace are ready.
        </p>

        <div className="mt-6 rounded-xl border border-gray-200 divide-y divide-gray-100 text-left text-sm">
          {[
            { label: 'Website', value: siteUrl },
            { label: 'Admin Console', value: adminUrl },
            ...(tenantId ? [{ label: 'Tenant ID', value: tenantId }] : []),
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-2 px-4 py-2.5">
              <span className="text-gray-500 w-28 shrink-0">{row.label}</span>
              <span className="font-mono text-xs text-gray-800 truncate flex-1">{row.value}</span>
              <button
                onClick={() => copy(row.label, row.value)}
                className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 transition shrink-0"
              >
                {copied === row.label ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Link href={adminUrl} className="px-4 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-semibold transition">
            Go to Dashboard
          </Link>
          <Link href={siteUrl} className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold transition">
            Visit Website
          </Link>
        </div>
        <p className="mt-4 text-xs text-gray-400">
          Next: customise your website, add your team, and start taking orders — all from the admin console.
        </p>
      </div>
    </div>
  );
}
