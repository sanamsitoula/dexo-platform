'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fitnessApi, publicApi } from '../../lib/api';

const GOALS = [
  { key: 'WEIGHT_LOSS', label: 'Lose weight', icon: '🔥' },
  { key: 'MUSCLE_GAIN', label: 'Build muscle', icon: '💪' },
  { key: 'ENDURANCE', label: 'Endurance', icon: '🏃' },
  { key: 'STRENGTH', label: 'Get stronger', icon: '🏋️' },
  { key: 'FLEXIBILITY', label: 'Flexibility', icon: '🧘' },
  { key: 'GENERAL_FITNESS', label: 'Stay fit', icon: '⚡' },
];

const PAYMENT_METHODS = [
  { key: 'eSewa', label: 'eSewa', sub: 'Pay instantly', color: '#60BB46', instant: true },
  { key: 'Khalti', label: 'Khalti', sub: 'Pay instantly', color: '#5C2D91', instant: true },
  { key: 'Cash', label: 'Cash at counter', sub: 'Activate at the gym', color: '#0EA5E9', instant: false },
];

type Step = 'welcome' | 'goals' | 'body' | 'bmi' | 'plan' | 'pay' | 'done';
const ORDER: Step[] = ['welcome', 'goals', 'body', 'bmi', 'plan', 'pay', 'done'];

function bmiCategory(bmi: number) {
  if (bmi < 18.5) return { label: 'Underweight', color: '#F59E0B', msg: 'Let’s build strength and healthy mass.' };
  if (bmi < 25) return { label: 'Healthy range', color: '#16A34A', msg: 'Great starting point — let’s build from here.' };
  if (bmi < 30) return { label: 'Overweight', color: '#F59E0B', msg: 'A steady plan will move this in the right direction.' };
  return { label: 'High', color: '#EF4444', msg: 'We’ll start gentle and progress safely with your trainer.' };
}

export default function FitnessOnboarding() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('welcome');
  const [info, setInfo] = useState<any>(null);
  const [member, setMember] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [membership, setMembership] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [goals, setGoals] = useState<string[]>([]);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [medical, setMedical] = useState('');

  const primary = info?.colorPrimary || '#E85D24';
  const stepIndex = ORDER.indexOf(step);
  const bmi = useMemo(() => (height && weight ? Number(weight) / Math.pow(Number(height) / 100, 2) : 0), [height, weight]);

  useEffect(() => {
    (async () => {
      const [i, m, p] = await Promise.all([publicApi.info(), fitnessApi.me(), fitnessApi.plans()]);
      if (i.data) setInfo(i.data);
      if (m.data) {
        setMember(m.data);
        if (m.data.height) setHeight(String(m.data.height));
        if (m.data.weight) setWeight(String(m.data.weight));
        if (m.data.goals) setGoals(String(m.data.goals).split(',').filter(Boolean));
      }
      if (p.data) setPlans(Array.isArray(p.data) ? p.data : p.data?.items ?? p.data?.data ?? []);
    })();
  }, []);

  const toggleGoal = (k: string) => setGoals((g) => (g.includes(k) ? g.filter((x) => x !== k) : [...g, k]));

  async function saveBodyAndReveal() {
    setSaving(true);
    setError(null);
    const res = await fitnessApi.updateMe({
      goals: goals.join(','),
      height: height ? parseFloat(height) : undefined,
      weight: weight ? parseFloat(weight) : undefined,
      medicalConditions: medical || undefined,
    });
    setSaving(false);
    if (res.error) return setError(res.error);
    setStep('bmi');
  }

  async function payAndActivate(method: (typeof PAYMENT_METHODS)[number]) {
    if (!member?.id || !selectedPlan?.id) return;
    setSaving(true);
    setError(null);
    const created = await fitnessApi.memberships.create(member.id, selectedPlan.id);
    if (created.error || !created.data?.id) {
      setSaving(false);
      return setError(created.error || 'Could not reserve plan.');
    }
    let ms = created.data;
    if (method.instant) {
      const ref = `${method.key.toUpperCase()}-${Date.now()}`;
      const act = await fitnessApi.memberships.activate(ms.id, ref, method.key);
      if (act.error) {
        setSaving(false);
        return setError(act.error);
      }
      if (act.data?.id) ms = act.data;
    }
    setSaving(false);
    setMembership(ms);
    setStep('done');
  }

  return (
    <div className="min-h-screen bg-[#F6F7F9]">
      {step !== 'welcome' && step !== 'done' && (
        <div className="px-6 pt-8 pb-2">
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${(stepIndex / (ORDER.length - 1)) * 100}%`, background: primary }} />
          </div>
          <div className="text-xs text-gray-400 font-semibold mt-1.5">Step {stepIndex} of {ORDER.length - 2}</div>
        </div>
      )}

      <div key={step} className="animate-[fadeIn_.35s_ease]">
        {step === 'welcome' && (
          <div className="min-h-screen flex flex-col justify-between p-8" style={{ background: primary }}>
            <div className="flex-1 flex flex-col justify-center">
              <div className="text-white/80 font-semibold uppercase tracking-widest text-sm">{info?.name || 'Your gym'}</div>
              <h1 className="text-white text-4xl font-extrabold mt-3 -tracking-tight">Welcome 👋</h1>
              <p className="text-white/90 text-lg mt-3 leading-relaxed">Let’s set up your fitness journey. Two minutes, and you’re training.</p>
            </div>
            <button onClick={() => setStep('goals')} className="w-full bg-white rounded-full py-4 font-extrabold text-lg flex items-center justify-center gap-2 shadow-lg" style={{ color: primary }}>
              Get started →
            </button>
          </div>
        )}

        {step === 'goals' && (
          <div className="px-6 py-4 max-w-md mx-auto">
            <h1 className="text-3xl font-extrabold text-gray-900 -tracking-tight">What brings you in?</h1>
            <p className="text-gray-500 mt-1.5 mb-6">Pick everything that fits. This shapes your plan.</p>
            <div className="grid grid-cols-3 gap-3">
              {GOALS.map((g) => {
                const active = goals.includes(g.key);
                return (
                  <button key={g.key} onClick={() => toggleGoal(g.key)}
                    className="relative rounded-2xl border-[1.5px] py-4 flex flex-col items-center transition bg-white"
                    style={active ? { borderColor: primary, background: primary + '10' } : { borderColor: '#E5E7EB' }}>
                    <span className="text-3xl">{g.icon}</span>
                    <span className={`text-xs mt-1.5 font-semibold ${active ? '' : 'text-gray-600'}`} style={active ? { color: primary } : {}}>{g.label}</span>
                  </button>
                );
              })}
            </div>
            <PrimaryBtn primary={primary} disabled={goals.length === 0} onClick={() => setStep('body')}>Continue</PrimaryBtn>
          </div>
        )}

        {step === 'body' && (
          <div className="px-6 py-4 max-w-md mx-auto">
            <h1 className="text-3xl font-extrabold text-gray-900 -tracking-tight">A few basics</h1>
            <p className="text-gray-500 mt-1.5 mb-6">So we can track progress and keep you safe.</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Height (cm)" value={height} onChange={setHeight} placeholder="170" />
              <Field label="Weight (kg)" value={weight} onChange={setWeight} placeholder="65" />
            </div>
            <label className="block text-sm font-semibold text-gray-800 mt-4 mb-2">Anything we should know? (optional)</label>
            <textarea value={medical} onChange={(e) => setMedical(e.target.value)} rows={3}
              placeholder="Injuries, allergies, conditions your trainer should know…"
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-gray-900 resize-none" />
            {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
            <PrimaryBtn primary={primary} disabled={!height || !weight || saving} onClick={saveBodyAndReveal}>
              {saving ? 'Saving…' : 'See my starting point'}
            </PrimaryBtn>
          </div>
        )}

        {step === 'bmi' && (
          <div className="px-6 py-10 max-w-md mx-auto flex flex-col items-center text-center min-h-[80vh] justify-center">
            <h1 className="text-3xl font-extrabold text-gray-900 -tracking-tight">Here’s your starting point</h1>
            <p className="text-gray-500 mt-1.5">We’ll measure everything from today.</p>
            {(() => {
              const cat = bmiCategory(bmi || 22);
              return (
                <>
                  <div className="my-10 w-56 h-56 rounded-full bg-white flex flex-col items-center justify-center shadow-xl animate-[pop_.5s_ease]" style={{ border: `14px solid ${cat.color}` }}>
                    <span className="text-sm text-gray-500 font-bold tracking-widest">BMI</span>
                    <span className="text-6xl font-extrabold -tracking-tight" style={{ color: cat.color }}>{(bmi || 0).toFixed(1)}</span>
                    <span className="mt-1 px-3 py-0.5 rounded-full text-sm font-bold" style={{ background: cat.color + '20', color: cat.color }}>{cat.label}</span>
                  </div>
                  <p className="text-gray-600 px-4">{cat.msg}</p>
                </>
              );
            })()}
            <PrimaryBtn primary={primary} onClick={() => setStep('plan')}>Let’s pick a plan</PrimaryBtn>
          </div>
        )}

        {step === 'plan' && (
          <div className="px-6 py-4 max-w-md mx-auto">
            <h1 className="text-3xl font-extrabold text-gray-900 -tracking-tight">Choose your plan</h1>
            <p className="text-gray-500 mt-1.5 mb-6">Unlock workouts, classes, and your trainer.</p>
            {plans.length === 0 && <p className="text-gray-400 italic py-8 text-center">No plans published yet. You can pick one later.</p>}
            <div className="space-y-3">
              {plans.map((p) => {
                const selected = selectedPlan?.id === p.id;
                return (
                  <button key={p.id} onClick={() => setSelectedPlan(p)}
                    className="w-full text-left bg-white rounded-3xl p-5 shadow-sm relative transition"
                    style={{ borderColor: selected ? primary : '#EAECEF', borderWidth: selected ? 2 : 1, borderStyle: 'solid' }}>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-extrabold text-gray-900">{p.name}</span>
                      <span className="text-lg font-extrabold" style={{ color: primary }}>NPR {p.totalWithVat ?? p.priceNpr}</span>
                    </div>
                    {p.description && <p className="text-sm text-gray-500 mt-1">{p.description}</p>}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Tag>📅 {p.durationDays} days</Tag>
                      {p.includesTrainer && <Tag>Trainer</Tag>}
                      {p.includesClasses && <Tag>Classes</Tag>}
                      {p.includesDietPlan && <Tag>Diet plan</Tag>}
                    </div>
                  </button>
                );
              })}
            </div>
            <PrimaryBtn primary={primary} disabled={!selectedPlan} onClick={() => setStep('pay')}>Continue to payment</PrimaryBtn>
          </div>
        )}

        {step === 'pay' && selectedPlan && (
          <div className="px-6 py-4 max-w-md mx-auto">
            <h1 className="text-3xl font-extrabold text-gray-900 -tracking-tight">How would you like to pay?</h1>
            <p className="text-gray-500 mt-1.5 mb-6">{selectedPlan.name} · <span className="font-bold" style={{ color: primary }}>NPR {selectedPlan.totalWithVat ?? selectedPlan.priceNpr}</span></p>
            <div className="space-y-3">
              {PAYMENT_METHODS.map((m) => (
                <button key={m.key} disabled={saving} onClick={() => payAndActivate(m)}
                  className="w-full flex items-center gap-4 bg-white rounded-2xl p-4 border border-gray-200 disabled:opacity-60">
                  <span className="w-11 h-11 rounded-xl flex items-center justify-center text-lg" style={{ background: m.color + '18', color: m.color }}>●</span>
                  <span className="flex-1 text-left">
                    <span className="block font-bold text-gray-900">{m.label}</span>
                    <span className="block text-xs text-gray-500">{m.sub}</span>
                  </span>
                  <span className="text-gray-400">{saving ? '…' : '→'}</span>
                </button>
              ))}
            </div>
            {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
            <p className="text-xs text-gray-400 mt-4 leading-relaxed">eSewa & Khalti run in sandbox for now. Cash keeps your plan reserved until you pay at the counter.</p>
          </div>
        )}

        {step === 'done' && (
          <SuccessView primary={primary} gym={info?.name} plan={selectedPlan} membership={membership} onFinish={() => router.replace('/')} />
        )}
      </div>

      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @keyframes pop { 0% { transform: scale(.7); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
}

function SuccessView({ primary, gym, plan, membership, onFinish }: any) {
  const pending = membership?.status && String(membership.status).toUpperCase() !== 'ACTIVE';
  const qr = membership?.qrCode || membership?.id || '';
  return (
    <div className="px-6 py-8 max-w-md mx-auto flex flex-col items-center text-center min-h-screen justify-between">
      <div className="flex flex-col items-center mt-6">
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-4xl shadow-lg" style={{ background: pending ? '#F59E0B' : '#16A34A' }}>
          {pending ? '⏳' : '✓'}
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 mt-4 -tracking-tight">{pending ? 'Almost there!' : 'You’re in! 🎉'}</h1>
        <p className="text-gray-500 mt-2 px-6">{pending ? 'Pay at the counter to activate your membership.' : 'Your membership is active. Show this QR to check in.'}</p>
      </div>

      <div className="w-[86%] rounded-[32px] p-6 shadow-2xl animate-[pop_.5s_ease]" style={{ background: primary }}>
        <div className="flex justify-between items-center">
          <span className="text-white font-extrabold">{gym || 'Dexo Fitness'}</span>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-widest" style={{ background: pending ? 'rgba(255,255,255,.25)' : '#fff', color: pending ? '#fff' : primary }}>{pending ? 'PENDING' : 'ACTIVE'}</span>
        </div>
        <div className="text-white text-2xl font-extrabold mt-6">{plan?.name || 'Membership'}</div>
        <div className="bg-white rounded-3xl p-4 mt-5 flex flex-col items-center">
          <QrBlock value={qr} />
          <div className="text-[11px] text-gray-500 font-mono mt-2 tracking-wider truncate max-w-full">{qr}</div>
        </div>
      </div>

      <div className="w-full">
        <PrimaryBtn primary={primary} onClick={onFinish}>Go to my dashboard</PrimaryBtn>
      </div>
    </div>
  );
}

function QrBlock({ value }: { value: string }) {
  // Deterministic QR-ish grid (swap for a real QR lib later); stable per value.
  const cells = Array.from({ length: 36 }).map((_, i) =>
    value ? (value.charCodeAt(i % value.length) + i) % 3 !== 0 : i % 2 === 0
  );
  return (
    <div className="grid grid-cols-6 w-36 h-36">
      {cells.map((on, i) => (
        <div key={i} style={{ background: on ? '#0B0F19' : 'transparent' }} />
      ))}
    </div>
  );
}

function PrimaryBtn({ children, primary, onClick, disabled }: any) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="w-full rounded-full py-4 text-white font-extrabold mt-8 shadow disabled:opacity-40 transition active:scale-[.99]"
      style={{ background: primary }}>
      {children}
    </button>
  );
}

function Field({ label, value, onChange, placeholder }: any) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-800 mb-2">{label}</label>
      <input inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-gray-900" />
    </div>
  );
}

function Tag({ children }: any) {
  return <span className="text-xs text-gray-600 font-semibold bg-gray-100 px-2.5 py-1 rounded-full">{children}</span>;
}
