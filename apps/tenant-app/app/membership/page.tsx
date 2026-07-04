'use client';

import { useEffect, useState } from 'react';
import { fitnessApi } from '../../lib/api';

const METHODS = [
  { key: 'ESEWA', label: 'eSewa' },
  { key: 'KHALTI', label: 'Khalti' },
  { key: 'CONNECTIPS', label: 'ConnectIPS' },
  { key: 'CASH', label: 'Cash at counter' },
];

export default function MembershipPage() {
  const [member, setMember] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pay, setPay] = useState<{ kind: 'plan' | 'membership'; plan?: any; membership?: any } | null>(null);
  const [method, setMethod] = useState('ESEWA');
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const m = await fitnessApi.me();
    setMember(m.data);
    const [p, h] = await Promise.all([
      fitnessApi.plans(),
      m.data?.id ? fitnessApi.memberships.list(m.data.id) : Promise.resolve({ data: null }),
    ]);
    setPlans(Array.isArray(p.data) ? p.data : (p.data as any)?.items ?? []);
    setHistory(Array.isArray(h.data) ? h.data : (h.data as any)?.items ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const active = member?.memberships?.[0] || history.find((x) => x.status === 'ACTIVE');

  async function confirm() {
    if (!pay) return;
    setBusy(true);
    try {
      let membershipId = pay.membership?.id;
      if (pay.kind === 'plan') {
        const created = await fitnessApi.memberships.create(member.id, pay.plan.id);
        if (created.error) throw new Error(created.error);
        membershipId = created.data?.id;
      }
      if (!membershipId) throw new Error('No membership');
      if (method === 'CASH') {
        alert('Reserved — pay at the counter to activate.');
      } else {
        const act = await fitnessApi.memberships.activate(membershipId, `${method}-${Date.now()}`, method);
        if (act.error) throw new Error(act.error);
        alert('Payment successful — membership active!');
      }
      setPay(null);
      await load();
    } catch (e: any) {
      alert(e?.message || 'Payment failed');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;

  return (
    <div className="px-4 py-5">
      <h1 className="text-xl font-bold text-gray-900">Membership</h1>

      {active ? (
        <div className="mt-3 rounded-xl p-4 text-white bg-orange-500">
          <div className="text-xs opacity-80 uppercase">Current plan</div>
          <div className="text-lg font-bold">{active.plan?.name}</div>
          <div className="text-sm opacity-90">Status {active.status} · until {active.endDate ? new Date(active.endDate).toLocaleDateString() : '—'}</div>
        </div>
      ) : (
        <p className="mt-3 text-gray-500 text-sm">No active membership. Choose a plan below.</p>
      )}

      <h2 className="mt-5 font-bold text-gray-900">Plans</h2>
      <div className="mt-2 space-y-3">
        {plans.map((p) => {
          const isCurrent = active?.planId === p.id;
          return (
            <div key={p.id} className="rounded-xl border border-gray-200 p-4">
              <div className="flex justify-between items-center">
                <div className="font-bold text-gray-900">{p.name}</div>
                <div className="font-bold text-orange-600">NPR {p.totalWithVat}</div>
              </div>
              {p.description && <p className="text-xs text-gray-500 mt-1">{p.description}</p>}
              <ul className="mt-2 text-xs text-gray-600 space-y-0.5">
                <li>✓ {p.durationDays} days access</li>
                <li>{p.includesTrainer ? '✓' : '✗'} Trainer · {p.includesClasses ? '✓' : '✗'} Classes · {p.includesDietPlan ? '✓' : '✗'} Diet plan</li>
              </ul>
              <button disabled={isCurrent} onClick={() => { setPay({ kind: 'plan', plan: p }); setMethod('ESEWA'); }}
                className="mt-3 w-full rounded-lg py-2 text-white text-sm font-semibold disabled:bg-gray-300 bg-orange-500">
                {isCurrent ? 'Current Plan' : `Subscribe · NPR ${p.totalWithVat}`}
              </button>
            </div>
          );
        })}
      </div>

      {history.length > 0 && (
        <>
          <h2 className="mt-6 font-bold text-gray-900">Billing history</h2>
          <div className="mt-2 space-y-2">
            {history.map((h) => (
              <div key={h.id} className="rounded-lg border border-gray-100 p-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-800">{h.plan?.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${h.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : h.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{h.status}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">NPR {h.amountPaid ?? h.plan?.totalWithVat} · {new Date(h.startDate).toLocaleDateString()}</div>
                {h.status === 'PENDING' && (
                  <button onClick={() => { setPay({ kind: 'membership', membership: h }); setMethod('ESEWA'); }} className="mt-2 w-full rounded-lg py-1.5 text-white text-sm font-semibold bg-orange-500">
                    Pay NPR {h.amountPaid ?? h.plan?.totalWithVat}
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {pay && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => !busy && setPay(null)}>
          <div className="w-full max-w-md mx-auto bg-white rounded-t-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="font-bold text-gray-900">
              {pay.kind === 'plan' ? `Subscribe · ${pay.plan?.name}` : `Pay · ${pay.membership?.plan?.name}`}
            </div>
            <div className="mt-1 text-2xl font-extrabold text-gray-900">
              NPR {pay.kind === 'plan' ? pay.plan?.totalWithVat : (pay.membership?.amountPaid ?? pay.membership?.plan?.totalWithVat)}
            </div>
            <div className="mt-4 text-sm font-semibold text-gray-700">Payment method</div>
            <div className="mt-2 space-y-2">
              {METHODS.map((m) => (
                <button key={m.key} onClick={() => setMethod(m.key)} className={`flex w-full items-center justify-between rounded-lg border p-3 ${method === m.key ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}>
                  <span className={method === m.key ? 'text-orange-600 font-semibold' : 'text-gray-700'}>{m.label}</span>
                  {method === m.key && <span className="text-orange-500">✓</span>}
                </button>
              ))}
            </div>
            <button onClick={confirm} disabled={busy} className="mt-4 w-full rounded-lg py-2.5 text-white font-semibold bg-orange-500 disabled:opacity-60">
              {busy ? 'Processing…' : method === 'CASH' ? 'Reserve (pay at counter)' : 'Pay now'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
