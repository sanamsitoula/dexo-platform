'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fitnessApi, publicApi } from '../../lib/api';
import { QrGrid } from '../_components/ui';

const QUOTES = [
  'Showing up is half the battle. You just won it.',
  'Consistency beats intensity. See you tomorrow.',
  'Every rep is a vote for who you’re becoming.',
];

export default function CheckinPage() {
  const router = useRouter();
  const [info, setInfo] = useState<any>(null);
  const [member, setMember] = useState<any>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [i, m, h] = await Promise.all([
        publicApi.info(),
        fitnessApi.me(),
        fitnessApi.myAttendance(60).catch(() => ({ data: [] as any[] })),
      ]);
      setInfo(i.data);
      setMember(m.data);
      setHistory(Array.isArray(h.data) ? h.data : []);
      const active = m.data?.memberships?.[0];
      if (active?.qrCode) setCode(active.qrCode);
    })();
  }, []);

  const primary = info?.colorPrimary || '#E85D24';
  const active = member?.memberships?.[0];

  async function checkin(qr: string) {
    if (!qr.trim()) return;
    setBusy(true); setError(null);
    const res = await fitnessApi.checkin.qr(qr.trim());
    setBusy(false);
    if (res.error) setError(res.error);
    else setResult(res.data);
  }

  if (result) {
    const quote = QUOTES[Math.floor((Date.now() / 86400000) % QUOTES.length)];
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="w-24 h-24 rounded-full flex items-center justify-center text-white text-5xl shadow-lg" style={{ background: '#16A34A' }}>✓</div>
        <h1 className="text-3xl font-extrabold text-gray-900 mt-5 -tracking-tight">You’re in! 💪</h1>
        <p className="text-gray-500 mt-2">Checked in at {info?.name || 'your gym'}</p>
        <div className="mt-6 rounded-3xl bg-white border border-gray-100 shadow-sm p-5 w-full max-w-sm">
          <p className="text-gray-700 italic">“{quote}”</p>
        </div>
        <button onClick={() => router.replace('/')} className="mt-8 w-full max-w-sm rounded-full py-3.5 text-white font-extrabold" style={{ background: primary }}>Let’s go</button>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 pb-24">
      <h1 className="text-2xl font-extrabold text-gray-900 px-2 -tracking-tight">Check in</h1>

      {active?.qrCode ? (
        <div className="mt-4 rounded-[28px] p-6 text-white text-center shadow-lg" style={{ background: primary }}>
          <div className="text-xs font-extrabold tracking-widest opacity-90">SHOW THIS AT THE DESK</div>
          <div className="flex justify-center my-5"><QrGrid value={active.qrCode} size={168} /></div>
          <div className="text-sm opacity-90 font-mono">{active.qrCode}</div>
        </div>
      ) : (
        <p className="mt-4 px-2 text-gray-500 text-sm">You need an active membership to check in.</p>
      )}

      <div className="mt-6 rounded-3xl bg-white border border-gray-100 shadow-sm p-5">
        <div className="text-sm font-semibold text-gray-700 mb-2">Or self check-in with your code</div>
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="VRFIT-XXXXXXXX"
          className="w-full rounded-2xl border border-gray-200 px-4 py-3 font-mono tracking-wider text-gray-900" />
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        <button onClick={() => checkin(code)} disabled={busy || !code}
          className="mt-3 w-full rounded-full py-3 text-white font-extrabold disabled:opacity-50" style={{ background: primary }}>
          {busy ? 'Checking in…' : 'Check in'}
        </button>
      </div>

      {/* My attendance — QR, manual and biometric (fingerprint) punches */}
      <h2 className="mt-6 px-2 font-extrabold text-gray-900">My attendance</h2>
      <div className="mt-2 space-y-2">
        {history.length === 0 ? (
          <div className="rounded-3xl bg-white border border-gray-100 p-5 text-center text-sm text-gray-500">
            No visits recorded yet — your check-ins and fingerprint punches will show up here.
          </div>
        ) : (
          history.slice(0, 30).map((a) => (
            <div key={a.id} className="rounded-2xl bg-white border border-gray-100 p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-gray-900">
                  {new Date(a.checkInTime).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {new Date(a.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {a.checkOutTime ? ` – ${new Date(a.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                  {a.duration ? ` · ${a.duration} min` : ''}
                  {a.branch?.name ? ` · ${a.branch.name}` : ''}
                </div>
              </div>
              <span className="text-lg" title={a.method || ''}>
                {a.method === 'BIOMETRIC' ? '🖐️' : a.method === 'QR_CODE' ? '📷' : '✍️'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
