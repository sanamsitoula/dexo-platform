'use client';

import { useEffect, useState } from 'react';
import { fitnessApi, paymentsApi, publicApi } from '../../lib/api';
import { QrGrid } from '../_components/ui';

const METHOD_META: Record<string, { label: string; color: string }> = {
  ESEWA: { label: 'eSewa', color: '#60BB46' },
  KHALTI: { label: 'Khalti', color: '#5C2D91' },
  CONNECTIPS: { label: 'ConnectIPS', color: '#0EA5E9' },
  FONEPAY: { label: 'Fonepay', color: '#DC2626' },
  STRIPE: { label: 'Card (Stripe)', color: '#635BFF' },
  PAYPAL: { label: 'PayPal', color: '#003087' },
  CASH: { label: 'Cash at counter', color: '#64748B' },
};

/** POST-redirect to the gateway using the formData returned by /payment-gateway/init. */
function submitGatewayForm(paymentUrl: string, formData?: Record<string, string>) {
  if (!formData || Object.keys(formData).length === 0) {
    window.location.href = paymentUrl;
    return;
  }
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = paymentUrl;
  Object.entries(formData).forEach(([k, v]) => {
    const input = document.createElement('input');
    input.type = 'hidden'; input.name = k; input.value = String(v);
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
}

export default function MembershipPage() {
  const [info, setInfo] = useState<any>(null);
  const [member, setMember] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pay, setPay] = useState<{ kind: 'plan' | 'membership'; plan?: any; membership?: any } | null>(null);
  const [method, setMethod] = useState('ESEWA');
  const [busy, setBusy] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [gateways, setGateways] = useState<string[]>([]);

  async function load() {
    const [i, m] = await Promise.all([publicApi.info(), fitnessApi.me()]);
    setInfo(i.data);
    setMember(m.data);
    const [p, h, g] = await Promise.all([
      fitnessApi.plans(),
      m.data?.id ? fitnessApi.memberships.list(m.data.id) : Promise.resolve({ data: null }),
      paymentsApi.providers().catch(() => ({ data: [] as any[] })),
    ]);
    setPlans(Array.isArray(p.data) ? p.data : (p.data as any)?.items ?? []);
    setHistory(Array.isArray(h.data) ? h.data : (h.data as any)?.items ?? []);
    const provList = Array.isArray(g.data) ? g.data : (g.data as any)?.providers ?? [];
    setGateways(provList.filter((x: any) => String(x.status).toUpperCase() === 'ACTIVE').map((x: any) => String(x.type).toUpperCase()));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const primary = info?.colorPrimary || '#E85D24';
  const active = member?.memberships?.[0] || history.find((x) => String(x.status).toUpperCase() === 'ACTIVE');
  const status = String(active?.status || '').toUpperCase();
  const totalDays = active?.plan?.durationDays || 30;
  const daysLeft = active?.endDate ? Math.max(0, Math.ceil((new Date(active.endDate).getTime() - Date.now()) / 86400000)) : 0;
  const pct = Math.max(0, Math.min(1, daysLeft / totalDays));

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
        // Reserved at the counter — membership stays PENDING until staff confirms.
        setPay(null);
        await load();
        return;
      }

      const amount = Number(
        pay.kind === 'plan'
          ? (pay.plan?.totalWithVat ?? pay.plan?.priceNpr)
          : (pay.membership?.amountPaid ?? pay.membership?.plan?.totalWithVat),
      );

      if (gateways.includes(method)) {
        // Real online payment: init with the gateway, then redirect.
        const origin = window.location.origin;
        const ret = `${origin}/payment/return?membershipId=${membershipId}&provider=${method}`;
        const init = await paymentsApi.init({
          providerType: method,
          orderId: membershipId,
          amount,
          description: pay.kind === 'plan' ? `Membership: ${pay.plan?.name}` : `Membership payment`,
          customerEmail: member?.user?.email,
          customerName: `${member?.user?.firstName ?? ''} ${member?.user?.lastName ?? ''}`.trim() || undefined,
          successUrl: `${ret}&status=success`,
          failureUrl: `${ret}&status=failure`,
          cancelUrl: `${ret}&status=cancel`,
        });
        if (init.error) throw new Error(init.error);
        const d: any = init.data;
        const paymentUrl = d?.paymentUrl || d?.redirectUrl || d?.url;
        if (!paymentUrl) throw new Error('Gateway did not return a payment URL');
        submitGatewayForm(paymentUrl, d?.formData);
        return; // navigating away — verification happens on /payment/return
      }

      // Gateway not configured by this gym — record as a manual/offline payment.
      const act = await fitnessApi.memberships.activate(membershipId, `${method}-${Date.now()}`, method);
      if (act.error) throw new Error(act.error);
      setPay(null);
      await load();
    } catch (e: any) {
      alert(e?.message || 'Payment failed');
    } finally {
      setBusy(false);
    }
  }

  async function renew() {
    if (!active) return;
    const r = await fitnessApi.memberships.renew(active.id);
    if (r.error) return alert(r.error);
    load();
  }
  async function freezeToggle() {
    if (!active) return;
    if (active.isFrozen) { const r = await fitnessApi.memberships.unfreeze(active.id); if (r.error) return alert(r.error); }
    else { const r = await fitnessApi.memberships.freeze(active.id, 7, 'User requested'); if (r.error) return alert(r.error); }
    load();
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;

  return (
    <div className="px-4 py-6 pb-24">
      <h1 className="text-2xl font-extrabold text-gray-900 px-2 -tracking-tight">Membership</h1>

      {active ? (
        <>
          {/* Wallet card */}
          <div className="mt-4 rounded-[32px] p-6 text-white shadow-2xl" style={{ background: primary }}>
            <div className="flex justify-between items-center">
              <span className="font-extrabold">{info?.name || 'Dexo Fitness'}</span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-widest" style={{ background: status === 'ACTIVE' ? '#fff' : 'rgba(255,255,255,.25)', color: status === 'ACTIVE' ? primary : '#fff' }}>{status || 'PENDING'}</span>
            </div>
            <div className="text-xl font-extrabold mt-5">{member?.user?.firstName || ''} {member?.user?.lastName || ''}</div>
            <div className="text-sm opacity-85">{active.plan?.name}</div>
            <div className="flex justify-center my-5"><QrGrid value={active.qrCode || active.id} size={150} /></div>
            <div className="flex justify-between text-xs">
              <div><div className="opacity-70 font-bold tracking-wider">DAYS LEFT</div><div className="text-base font-extrabold mt-0.5">{daysLeft}</div></div>
              <div className="text-right"><div className="opacity-70 font-bold tracking-wider">VALID UNTIL</div><div className="text-base font-extrabold mt-0.5">{active.endDate ? new Date(active.endDate).toLocaleDateString() : '—'}</div></div>
            </div>
            <div className="h-1.5 bg-white/25 rounded-full mt-3 overflow-hidden"><div className="h-1.5 bg-white rounded-full" style={{ width: `${pct * 100}%` }} /></div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <ActionBtn label="Renew" icon="🔄" primary={primary} onClick={renew} />
            <ActionBtn label={active.isFrozen ? 'Unfreeze' : 'Freeze'} icon={active.isFrozen ? '▶️' : '⏸'} primary={primary} onClick={freezeToggle} />
            <ActionBtn label="Change" icon="✨" primary={primary} onClick={() => setShowPlans((s) => !s)} />
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-3xl border border-dashed border-gray-300 p-6 text-center">
          <div className="text-4xl">💳</div>
          <div className="font-bold text-gray-900 mt-2">No active membership</div>
          <p className="text-sm text-gray-500 mt-1">Choose a plan to unlock everything.</p>
          <button onClick={() => setShowPlans(true)} className="mt-4 rounded-full px-6 py-2.5 text-white font-bold" style={{ background: primary }}>Choose a plan</button>
        </div>
      )}

      {/* Plans */}
      {(showPlans || !active) && (
        <>
          <h2 className="mt-6 px-2 font-extrabold text-gray-900">{active ? 'Change plan' : 'Plans'}</h2>
          <div className="mt-2 space-y-3">
            {plans.map((p) => {
              const isCurrent = active?.planId === p.id;
              return (
                <div key={p.id} className="rounded-3xl border p-5 bg-white" style={{ borderColor: isCurrent ? primary : '#EAECEF', borderWidth: isCurrent ? 2 : 1 }}>
                  <div className="flex justify-between items-center">
                    <div className="font-extrabold text-gray-900">{p.name}</div>
                    <div className="font-extrabold" style={{ color: primary }}>NPR {p.totalWithVat ?? p.priceNpr}</div>
                  </div>
                  {p.description && <p className="text-xs text-gray-500 mt-1">{p.description}</p>}
                  <div className="flex flex-wrap gap-2 mt-3 text-xs text-gray-600 font-semibold">
                    <span className="bg-gray-100 px-2.5 py-1 rounded-full">📅 {p.durationDays}d</span>
                    {p.includesTrainer && <span className="bg-gray-100 px-2.5 py-1 rounded-full">Trainer</span>}
                    {p.includesClasses && <span className="bg-gray-100 px-2.5 py-1 rounded-full">Classes</span>}
                  </div>
                  <button disabled={isCurrent} onClick={() => { setPay({ kind: 'plan', plan: p }); setMethod('ESEWA'); }}
                    className="mt-4 w-full rounded-full py-2.5 text-white text-sm font-bold disabled:opacity-40" style={{ background: primary }}>
                    {isCurrent ? 'Current plan' : `Subscribe · NPR ${p.totalWithVat ?? p.priceNpr}`}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Billing history */}
      {history.length > 0 && (
        <>
          <h2 className="mt-6 px-2 font-extrabold text-gray-900">Billing history</h2>
          <div className="mt-2 space-y-2">
            {history.map((h) => (
              <div key={h.id} className="rounded-2xl border border-gray-100 p-4 bg-white">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-800">{h.plan?.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${String(h.status).toUpperCase() === 'ACTIVE' ? 'bg-green-100 text-green-700' : String(h.status).toUpperCase() === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{h.status}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">NPR {h.amountPaid ?? h.plan?.totalWithVat} · {h.startDate ? new Date(h.startDate).toLocaleDateString() : ''}{h.paymentMethod ? ` · ${h.paymentMethod}` : ''}</div>
                {String(h.status).toUpperCase() === 'PENDING' && (
                  <button onClick={() => { setPay({ kind: 'membership', membership: h }); setMethod('ESEWA'); }} className="mt-2 w-full rounded-full py-1.5 text-white text-sm font-bold" style={{ background: primary }}>
                    Pay NPR {h.amountPaid ?? h.plan?.totalWithVat}
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Payment sheet */}
      {pay && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => !busy && setPay(null)}>
          <div className="w-full max-w-md mx-auto bg-white rounded-t-[28px] p-6" onClick={(e) => e.stopPropagation()}>
            <div className="font-bold text-gray-900">{pay.kind === 'plan' ? `Subscribe · ${pay.plan?.name}` : `Pay · ${pay.membership?.plan?.name}`}</div>
            <div className="mt-1 text-3xl font-extrabold text-gray-900">NPR {pay.kind === 'plan' ? (pay.plan?.totalWithVat ?? pay.plan?.priceNpr) : (pay.membership?.amountPaid ?? pay.membership?.plan?.totalWithVat)}</div>
            <div className="mt-5 text-sm font-semibold text-gray-700">Payment method</div>
            <div className="mt-2 space-y-2">
              {[...gateways.filter((k) => METHOD_META[k]), ...(gateways.length ? [] : ['ESEWA', 'KHALTI']), 'CASH'].map((key) => {
                const m = METHOD_META[key] ?? { label: key, color: '#64748B' };
                const online = gateways.includes(key);
                return (
                  <button key={key} onClick={() => setMethod(key)} className="flex w-full items-center justify-between rounded-2xl border p-3.5" style={{ borderColor: method === key ? primary : '#EAECEF', background: method === key ? primary + '0D' : '#fff' }}>
                    <span className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: m.color + '22', color: m.color }}>●</span>
                      <span className={method === key ? 'font-bold' : 'text-gray-700'} style={method === key ? { color: primary } : {}}>{m.label}</span>
                      {online && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-700">online</span>}
                    </span>
                    {method === key && <span style={{ color: primary }}>✓</span>}
                  </button>
                );
              })}
            </div>
            <button onClick={confirm} disabled={busy} className="mt-5 w-full rounded-full py-3 text-white font-bold disabled:opacity-60" style={{ background: primary }}>
              {busy ? 'Processing…' : method === 'CASH' ? 'Reserve (pay at counter)' : 'Pay now'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionBtn({ label, icon, primary, onClick }: any) {
  return (
    <button onClick={onClick} className="flex flex-col items-center rounded-2xl bg-white border border-gray-100 shadow-sm py-3">
      <span className="w-11 h-11 rounded-xl flex items-center justify-center text-lg" style={{ background: primary + '15' }}>{icon}</span>
      <span className="text-xs text-gray-700 mt-1.5 font-semibold">{label}</span>
    </button>
  );
}
