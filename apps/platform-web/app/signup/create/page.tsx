'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
// Deep import: the package root index pulls in NestJS/Prisma server code,
// which must not land in a client bundle.
import { industryThemes, IndustryTheme, templatesForDomain, getTemplate, WebsiteTemplate } from '@dexo/shared/src/themes';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const DRAFT_KEY = 'dexo-signup-draft';

const STEPS = [
  { key: 'industry',  title: 'Business',  minutes: 4 },
  { key: 'theme',     title: 'Template',  minutes: 3 },
  { key: 'basics',    title: 'Details',   minutes: 2.5 },
  { key: 'branding',  title: 'Brand',     minutes: 1.5 },
  { key: 'subdomain', title: 'Domain',    minutes: 1 },
  { key: 'plan',      title: 'Publish',   minutes: 0.5 },
];

interface Template {
  id: string;
  domainType: string;
  name: string;
  tagline: string;
  description: string;
  colorPrimary: string;
  features: Record<string, boolean>;
  icon?: string | null;
}

/** Emoji for an industry card. Prefers the platform-admin-managed `icon` field
 * on the template itself; the fuzzy domainType match below is only a fallback
 * for templates seeded before that field existed. */
function industryEmoji(domainType: string): string {
  const d = domainType.toLowerCase();
  const map: Array<[string, string]> = [
    ['fitness', '🏋️'], ['gym', '🏋️'],
    ['school', '🏫'], ['education', '🏫'], ['coaching', '🎓'],
    ['restaurant', '🍽️'], ['cafe', '☕'], ['food', '🍽️'],
    ['ecommerce', '🛒'], ['shop', '🛒'], ['retail', '🛍️'],
    ['logistics', '🚚'], ['delivery', '🚚'],
    ['tailor', '🧵'],
    ['salon', '💇'], ['spa', '💆'], ['beauty', '💅'],
    ['hotel', '🏨'], ['hospitality', '🏨'],
    ['health', '🏥'], ['clinic', '🏥'], ['hospital', '🏥'], ['dental', '🦷'],
    ['ngo', '❤️'], ['corporate', '🏢'], ['legal', '⚖️'], ['real', '🏠'],
    ['travel', '🧳'], ['event', '🎉'], ['photo', '📸'], ['auto', '🚗'],
  ];
  for (const [k, e] of map) if (d.includes(k)) return e;
  return '💼';
}

/** Fuzzy map a business-template domainType to matching theme industries. */
function themeMatchesDomain(theme: IndustryTheme, domainType: string): boolean {
  const d = domainType.toLowerCase();
  const i = theme.industry.toLowerCase();
  const pairs: Array<[string, string]> = [
    ['fitness', 'fitness'], ['gym', 'fitness'],
    ['school', 'education'], ['education', 'education'], ['coaching', 'coaching'],
    ['restaurant', 'restaurant'], ['cafe', 'restaurant'], ['food', 'restaurant'],
    ['ecommerce', 'ecommerce'], ['shop', 'ecommerce'], ['retail', 'ecommerce'],
    ['logistics', 'logistics'], ['delivery', 'logistics'],
    ['tailor', 'tailor'],
    ['salon', 'salon'], ['spa', 'salon'], ['beauty', 'salon'],
    ['hotel', 'hotel'], ['hospitality', 'hotel'],
    ['health', 'health'], ['clinic', 'health'], ['hospital', 'health'],
  ];
  return pairs.some(([dk, ik]) => d.includes(dk) && i.includes(ik));
}

const BRAND_PRESETS = [
  { name: 'Modern Blue',    primary: '#2563EB', accent: '#38BDF8' },
  { name: 'Luxury Black',   primary: '#111827', accent: '#C9A227' },
  { name: 'Eco Green',      primary: '#059669', accent: '#84CC16' },
  { name: 'Minimal Slate',  primary: '#334155', accent: '#94A3B8' },
  { name: 'Creative Purple',primary: '#7C3AED', accent: '#EC4899' },
  { name: 'Corporate Navy', primary: '#1E3A5F', accent: '#3B82F6' },
  { name: 'Elegant Gold',   primary: '#92400E', accent: '#D97706' },
  { name: 'Warm Orange',    primary: '#EA580C', accent: '#F59E0B' },
  { name: 'Rose Quartz',    primary: '#BE185D', accent: '#F472B6' },
  { name: 'Midnight Teal',  primary: '#0F766E', accent: '#2DD4BF' },
];

const PLANS = [
  { id: 'FREE',       name: 'Free',       price: 'Rs. 0',      blurb: 'Try everything, 1 user',            features: ['Website + subdomain', '1 admin user', 'Core modules'] },
  { id: 'STARTER',    name: 'Starter',    price: 'Rs. 1,499',  blurb: 'For small teams getting going',     features: ['Everything in Free', '5 users', 'Invoicing & CRM', 'Email support'] },
  { id: 'GROWTH',     name: 'Growth',     price: 'Rs. 3,999',  blurb: 'Most popular for growing business', features: ['Everything in Starter', '20 users', 'All modules', 'Custom domain', 'Priority support'], popular: true },
  { id: 'ENTERPRISE', name: 'Enterprise', price: 'Custom',     blurb: 'Advanced needs & scale',            features: ['Unlimited users', 'SLA & onboarding', 'Dedicated support'] },
] as const;

const PROVISION_STAGES = [
  'Creating workspace…',
  'Generating website…',
  'Configuring database…',
  'Installing modules…',
  'Generating admin panel…',
  'Securing with SSL…',
  'Publishing website…',
];

/** Structurally distinct wireframe thumbnail — each design family renders a different layout. */
function TemplateThumb({ t }: { t: WebsiteTemplate }) {
  const p = t.palette;
  const r = Math.min(t.borderRadius, 10);
  return (
    <div className="h-36 w-full overflow-hidden" style={{ backgroundColor: p.background }}>
      {t.heroType === 'split' && (
        <div className="h-full p-3 flex flex-col">
          <div className="flex items-center gap-1 mb-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.primary }} />
            <span className="h-1.5 w-10 rounded" style={{ backgroundColor: p.textSecondary, opacity: 0.4 }} />
            <span className="ml-auto flex gap-1">{[0, 1, 2].map((i) => <span key={i} className="h-1 w-4 rounded" style={{ backgroundColor: p.textSecondary, opacity: 0.35 }} />)}</span>
          </div>
          <div className="flex-1 flex gap-2 items-center">
            <div className="flex-1 space-y-1.5">
              <div className="h-2.5 w-full rounded" style={{ backgroundColor: p.text, opacity: 0.85 }} />
              <div className="h-2.5 w-3/4 rounded" style={{ backgroundColor: p.text, opacity: 0.85 }} />
              <div className="h-1.5 w-full rounded" style={{ backgroundColor: p.textSecondary, opacity: 0.4 }} />
              <div className="h-4 w-14 mt-1" style={{ backgroundColor: p.primary, borderRadius: r }} />
            </div>
            <div className="w-2/5 h-4/5" style={{ background: `linear-gradient(135deg, ${p.primary}55, ${p.accent}88)`, borderRadius: r }} />
          </div>
        </div>
      )}
      {t.heroType === 'fullscreen' && (
        <div className="h-full relative flex flex-col items-center justify-center" style={{ background: `linear-gradient(180deg, ${p.primary}CC, ${p.text}DD)` }}>
          <div className="absolute top-2 inset-x-0 flex justify-center gap-2 items-center">
            <span className="h-1 w-6 rounded bg-white/50" />
            <span className="h-2 w-2 rounded-full bg-white/90" />
            <span className="h-1 w-6 rounded bg-white/50" />
          </div>
          <div className="h-2.5 w-2/3 rounded bg-white/90" />
          <div className="h-1.5 w-1/2 rounded bg-white/50 mt-1.5" />
          <div className="h-4 w-16 mt-2 border border-white/80" style={{ borderRadius: r }} />
        </div>
      )}
      {t.heroType === 'editorial' && (
        <div className="h-full p-3">
          <div className="flex items-center justify-between mb-3">
            <span className="h-1.5 w-8 rounded" style={{ backgroundColor: p.text }} />
            <span className="space-y-0.5"><span className="block h-0.5 w-3" style={{ backgroundColor: p.text }} /><span className="block h-0.5 w-3" style={{ backgroundColor: p.text }} /></span>
          </div>
          <div className="h-4 w-11/12 rounded-sm" style={{ backgroundColor: p.text }} />
          <div className="h-4 w-2/3 rounded-sm mt-1.5" style={{ backgroundColor: p.text }} />
          <div className="h-px w-full my-2.5" style={{ backgroundColor: p.textSecondary, opacity: 0.4 }} />
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => <span key={i} className="h-6 flex-1 border" style={{ borderColor: p.textSecondary + '66', borderRadius: r, backgroundColor: p.surface }} />)}
          </div>
        </div>
      )}
      {t.heroType === 'floating-cards' && (
        <div className="h-full p-3 relative" style={{ background: `radial-gradient(circle at 70% 20%, ${p.primary}44, transparent 60%), ${p.background}` }}>
          <div className="flex items-center gap-1 mb-3">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.accent }} />
            <span className="ml-auto flex gap-1">{[0, 1, 2].map((i) => <span key={i} className="h-1 w-4 rounded bg-white/25" />)}</span>
          </div>
          <div className="h-2.5 w-3/5 rounded bg-white/90" />
          <div className="h-1.5 w-2/5 rounded bg-white/40 mt-1.5" />
          <div className="absolute right-3 bottom-3 h-12 w-20 border border-white/20 backdrop-blur" style={{ backgroundColor: '#ffffff14', borderRadius: r }} />
          <div className="absolute right-10 bottom-7 h-12 w-20 border border-white/25" style={{ backgroundColor: '#ffffff20', borderRadius: r }} />
          <div className="absolute left-3 bottom-3 h-4 w-14" style={{ backgroundColor: p.primary, borderRadius: 999, boxShadow: `0 0 12px ${p.primary}` }} />
        </div>
      )}
      {t.heroType === 'bold-block' && (
        <div className="h-full p-2.5" style={{ backgroundColor: p.background }}>
          <div className="h-full border-2 flex flex-col" style={{ borderColor: p.text }}>
            <div className="flex items-center justify-between px-2 py-1 border-b-2" style={{ borderColor: p.text }}>
              <span className="h-2 w-8" style={{ backgroundColor: p.text }} />
              <span className="h-2 w-2" style={{ backgroundColor: p.accent }} />
            </div>
            <div className="flex-1 flex flex-col justify-center px-2" style={{ backgroundColor: p.primary }}>
              <div className="h-3 w-11/12 bg-white" />
              <div className="h-3 w-3/5 bg-white mt-1" />
            </div>
            <div className="flex border-t-2" style={{ borderColor: p.text }}>
              <span className="flex-1 h-4" style={{ backgroundColor: p.accent }} />
              <span className="flex-1 h-4 border-l-2" style={{ borderColor: p.text, backgroundColor: p.surface }} />
              <span className="flex-1 h-4 border-l-2" style={{ borderColor: p.text, backgroundColor: p.text }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 40);
}

export default function SignupWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [industrySearch, setIndustrySearch] = useState('');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [data, setData] = useState<any>({
    name: '',
    phone: '',
    address: '',
    domainType: '',
    themeId: '',
    templateId: '',
    logo: '',
    colorPrimary: '#1f2937',
    colorAccent: '#3b82f6',
    slug: '',
    slugEdited: false,
    plan: 'GROWTH',
    ownerEmail: '',
    ownerPassword: '',
  });
  const [slugStatus, setSlugStatus] = useState<{ available: boolean; reason?: string } | null>(null);
  const [slugChecking, setSlugChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [provisionStage, setProvisionStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [resumed, setResumed] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/business-templates`).then((r) => r.json()).then(setTemplates).catch(() => {});
  }, []);

  // Resume a saved draft (password is never persisted).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft?.data?.domainType || draft?.data?.name) {
          setData((d: any) => ({ ...d, ...draft.data, ownerPassword: '' }));
          setStep(Math.min(draft.step ?? 0, STEPS.length - 1));
          setResumed(true);
        }
      }
    } catch { /* corrupt draft — start fresh */ }
  }, []);

  // Auto-save draft on every change with a subtle "Saved" pill.
  useEffect(() => {
    if (!data.domainType && !data.name) return;
    const { ownerPassword, ...safe } = data;
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, data: safe }));
    setSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 1500);
  }, [data, step]);

  const current = STEPS[step];
  const selectedTheme = useMemo(
    () => industryThemes.find((t) => t.id === data.themeId),
    [data.themeId],
  );
  // Five design-family templates for the chosen industry.
  const domainTemplates = useMemo(
    () => (data.domainType ? templatesForDomain(data.domainType) : []),
    [data.domainType],
  );
  const selectedTemplate = useMemo(() => getTemplate(data.templateId), [data.templateId]);

  const filteredTemplates = useMemo(() => {
    if (!industrySearch.trim()) return templates;
    const q = industrySearch.toLowerCase();
    return templates.filter((t) =>
      t.name.toLowerCase().includes(q) || t.tagline?.toLowerCase().includes(q) || t.domainType.toLowerCase().includes(q));
  }, [templates, industrySearch]);

  const brandPrimary = data.colorPrimary !== '#1f2937' ? data.colorPrimary : (selectedTheme?.colors.primary || '#0f172a');
  const minutesLeft = Math.ceil(STEPS[step].minutes);

  const stepValid = useMemo(() => {
    switch (current.key) {
      case 'industry':  return Boolean(data.domainType);
      case 'theme':     return Boolean(data.templateId);
      case 'basics':    return Boolean(data.name && data.ownerEmail && data.ownerPassword?.length >= 8);
      case 'branding':  return true;
      case 'subdomain': return Boolean(data.slug && slugStatus?.available);
      case 'plan':      return Boolean(data.plan);
      default:          return true;
    }
  }, [current.key, data, slugStatus]);

  function next() { if (step < STEPS.length - 1 && stepValid) setStep(step + 1); }
  function prev() { if (step > 0) setStep(step - 1); }

  // Enter advances the wizard (except while typing multi-line or on final step).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Enter' && !e.shiftKey && step < STEPS.length - 1) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'TEXTAREA' || tag === 'BUTTON') return;
        next();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function pickIndustry(t: Template) {
    // Pre-select the best matching theme so a fast user can just click Continue.
    const recommended = industryThemes.find((th) => themeMatchesDomain(th, t.domainType));
    setData((d: any) => ({
      ...d,
      domainType: t.domainType,
      templateId: d.domainType === t.domainType ? d.templateId : '',
      themeId: recommended?.id || d.themeId || '',
      colorPrimary: d.themeId ? d.colorPrimary : (recommended?.colors.primary || d.colorPrimary),
      colorAccent: d.themeId ? d.colorAccent : (recommended?.colors.accent || d.colorAccent),
      logo: d.logo || recommended?.logo || '',
    }));
    // Picking an industry is always a complete, valid answer for this step —
    // advance immediately instead of making the user also press "Continue".
    // Small delay so the selected-card highlight is visible before the
    // step transitions (matches the existing .step-anim transition timing).
    setTimeout(() => setStep((s) => (s < STEPS.length - 1 ? s + 1 : s)), 200);
  }

  function pickTemplate(t: WebsiteTemplate) {
    // themeId keeps the backend admin theme in sync; the template drives the website look.
    const baseTheme = industryThemes.find((th) => themeMatchesDomain(th, data.domainType));
    setData((d: any) => ({
      ...d,
      templateId: t.id,
      themeId: d.themeId || baseTheme?.id || industryThemes[0]?.id || '',
      colorPrimary: t.palette.primary,
      colorAccent: t.palette.accent,
    }));
  }

  // Keep slug in sync with business name until the user edits it manually.
  useEffect(() => {
    if (!data.slugEdited && data.name) {
      const s = slugify(data.name);
      if (s !== data.slug) setData((d: any) => ({ ...d, slug: s }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.name]);

  // Debounced availability check whenever the slug changes.
  useEffect(() => {
    if (!data.slug) { setSlugStatus(null); return; }
    setSlugChecking(true);
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/api/tenants/check-slug?slug=${encodeURIComponent(data.slug)}`);
        setSlugStatus(await res.json());
      } catch {
        setSlugStatus(null);
      } finally {
        setSlugChecking(false);
      }
    }, 450);
    return () => clearTimeout(id);
  }, [data.slug]);

  const slugSuggestions = useMemo(() => {
    if (!data.slug || slugStatus?.available !== false) return [];
    const base = data.slug.replace(/-?\d+$/, '');
    return [`${base}-np`, `${base}-hq`, `my-${base}`, `${base}${new Date().getFullYear()}`].slice(0, 4);
  }, [data.slug, slugStatus]);

  const applyPreset = useCallback((p: (typeof BRAND_PRESETS)[number]) => {
    setData((d: any) => ({ ...d, colorPrimary: p.primary, colorAccent: p.accent }));
  }, []);

  async function submit() {
    setSubmitting(true);
    setProvisionStage(0);
    setError(null);
    // Animated provisioning checklist while the API call runs.
    const stageTimer = setInterval(
      () => setProvisionStage((s) => Math.min(s + 1, PROVISION_STAGES.length - 1)),
      900,
    );
    try {
      const res = await fetch(`${API_URL}/api/tenants/provision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: data.slug,
          name: data.name,
          domainType: data.domainType,
          themeId: data.themeId,
          branding: {
            colorPrimary: data.colorPrimary,
            colorAccent: data.colorAccent,
            logo: data.logo,
            templateId: data.templateId || undefined,
          },
          ownerEmail: data.ownerEmail,
          ownerPassword: data.ownerPassword,
          ownerFirstName: data.ownerFirstName || data.name,
          ownerLastName: data.ownerLastName || 'Owner',
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Failed (${res.status})`);
      }
      const result = await res.json();
      localStorage.removeItem(DRAFT_KEY);
      setProvisionStage(PROVISION_STAGES.length - 1);
      router.push(`/signup/success?tenant=${result.tenantId}&sub=${result.subdomain}`);
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    } finally {
      clearInterval(stageTimer);
    }
  }

  /* ---------- Live preview panel ---------- */
  const previewTheme = selectedTheme || industryThemes[0];
  const tpl = selectedTemplate;
  const pv = {
    bg: tpl?.palette.background || previewTheme?.colors.background || '#ffffff',
    surface: tpl?.palette.surface || '#ffffff',
    text: tpl?.palette.text || previewTheme?.colors.text || '#0f172a',
    sub: tpl?.palette.textSecondary || previewTheme?.colors.textSecondary || '#64748b',
    primary: data.colorPrimary,
    accent: data.colorAccent,
    radius: tpl ? Math.min(tpl.borderRadius, 12) : 8,
  };
  const heroCopy = tpl?.hero || previewTheme?.landingHero || { title: 'Welcome', subtitle: 'Your business, online in minutes.', cta: 'Get Started' };
  const previewName = data.name || 'Your Business';
  const previewMenu = (previewTheme?.menuItems || []).slice(0, previewDevice === 'mobile' ? 3 : 5);
  const heroType = tpl?.heroType || 'split';
  const navStyle = tpl?.navigationStyle || 'classic';

  const livePreview = (
    <div className="sticky top-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Live preview</span>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {(['desktop', 'mobile'] as const).map((d) => (
            <button
              key={d}
              onClick={() => setPreviewDevice(d)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                previewDevice === d ? 'bg-white shadow text-gray-900' : 'text-gray-400'
              }`}
            >
              {d === 'desktop' ? '🖥' : '📱'}
            </button>
          ))}
        </div>
      </div>
      <div
        className={`rounded-2xl border border-gray-200 shadow-lg overflow-hidden transition-all duration-300 mx-auto ${
          previewDevice === 'mobile' ? 'max-w-[240px]' : ''
        }`}
      >
        {/* Browser chrome */}
        <div className="bg-gray-100 px-3 py-2 flex items-center gap-1.5 border-b border-gray-200">
          <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          <span className="ml-2 flex-1 bg-white rounded px-2 py-0.5 text-[10px] text-gray-400 font-mono truncate">
            {(data.slug || 'your-business')}.onedexo.com
          </span>
        </div>
        <div className="transition-colors duration-300" style={{ backgroundColor: pv.bg }}>
          {/* Nav — varies by template navigation style */}
          {navStyle === 'centered' && (
            <div className="px-4 py-3 flex flex-col items-center gap-1 border-b border-black/5">
              <span className="flex items-center gap-1.5">
                <span className="text-lg">{data.logo && !String(data.logo).startsWith('http') ? data.logo : (previewTheme?.logo || '✨')}</span>
                <span className="font-bold text-xs tracking-widest uppercase" style={{ color: pv.text }}>{previewName}</span>
              </span>
              <span className="flex gap-3 text-[8px] tracking-wide uppercase" style={{ color: pv.sub }}>
                {previewMenu.map((m) => <span key={m.label}>{m.label}</span>)}
              </span>
            </div>
          )}
          {navStyle === 'minimal' && (
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="font-bold text-xs" style={{ color: pv.text }}>{previewName}</span>
              <span className="space-y-0.5">
                <span className="block h-0.5 w-4" style={{ backgroundColor: pv.text }} />
                <span className="block h-0.5 w-4" style={{ backgroundColor: pv.text }} />
              </span>
            </div>
          )}
          {navStyle === 'bottom-bar' && (
            <div className="px-4 py-2.5 flex items-center justify-between border-b-2" style={{ borderColor: pv.text }}>
              <span className="font-black text-xs uppercase" style={{ color: pv.text }}>{previewName}</span>
              <span className="h-3 w-3" style={{ backgroundColor: pv.accent }} />
            </div>
          )}
          {(navStyle === 'classic' || navStyle === 'transparent') && (
            <div className={`px-4 py-3 flex items-center gap-2 ${navStyle === 'classic' ? 'border-b border-black/5' : ''}`}>
              <span className="text-lg">{data.logo && !String(data.logo).startsWith('http') ? data.logo : (previewTheme?.logo || '✨')}</span>
              <span className="font-bold text-xs truncate" style={{ color: pv.text }}>{previewName}</span>
              <span className="ml-auto flex gap-2 text-[9px]" style={{ color: pv.sub }}>
                {previewMenu.map((m) => <span key={m.label}>{m.label}</span>)}
              </span>
            </div>
          )}

          {/* Hero — varies by template hero type */}
          {heroType === 'fullscreen' && (
            <div className="px-4 py-8 text-center" style={{ background: `linear-gradient(180deg, ${pv.primary}CC, ${pv.text}CC)` }}>
              <div className="text-sm font-bold leading-snug text-white" style={{ fontFamily: 'Georgia, serif' }}>{heroCopy.title}</div>
              <div className="mt-1 text-[10px] leading-snug text-white/70">{heroCopy.subtitle}</div>
              <span className="inline-block mt-3 px-4 py-1.5 text-[10px] font-semibold text-white border border-white/80" style={{ borderRadius: pv.radius }}>
                {heroCopy.cta}
              </span>
            </div>
          )}
          {heroType === 'floating-cards' && (
            <div className="px-4 py-6 relative overflow-hidden" style={{ background: `radial-gradient(circle at 75% 15%, ${pv.primary}55, transparent 60%)` }}>
              <div className="text-sm font-bold leading-snug" style={{ color: pv.text }}>{heroCopy.title}</div>
              <div className="mt-1 text-[10px] leading-snug max-w-[70%]" style={{ color: pv.sub }}>{heroCopy.subtitle}</div>
              <span className="inline-block mt-3 px-3 py-1.5 text-[10px] font-semibold text-white" style={{ backgroundColor: pv.primary, borderRadius: 999, boxShadow: `0 0 14px ${pv.primary}88` }}>
                {heroCopy.cta}
              </span>
              <span className="absolute right-3 bottom-2 h-10 w-16 border border-white/20 backdrop-blur-sm" style={{ backgroundColor: '#ffffff14', borderRadius: pv.radius }} />
              <span className="absolute right-8 bottom-5 h-10 w-16 border border-white/25" style={{ backgroundColor: '#ffffff20', borderRadius: pv.radius }} />
            </div>
          )}
          {heroType === 'editorial' && (
            <div className="px-4 py-6">
              <div className="text-base font-bold leading-tight tracking-tight" style={{ color: pv.text }}>{heroCopy.title}</div>
              <div className="h-px w-full my-2.5" style={{ backgroundColor: pv.sub, opacity: 0.4 }} />
              <div className="text-[10px] leading-snug" style={{ color: pv.sub }}>{heroCopy.subtitle}</div>
              <span className="inline-block mt-2 text-[10px] font-semibold underline underline-offset-2" style={{ color: pv.text }}>
                {heroCopy.cta} →
              </span>
            </div>
          )}
          {heroType === 'bold-block' && (
            <div className="px-3 py-3">
              <div className="border-2 p-3" style={{ borderColor: pv.text, backgroundColor: pv.primary }}>
                <div className="text-xs font-black leading-snug text-white uppercase">{heroCopy.title}</div>
                <div className="mt-1 text-[9px] leading-snug text-white/80">{heroCopy.subtitle}</div>
                <span className="inline-block mt-2 px-3 py-1 text-[10px] font-black uppercase border-2 border-white text-white">
                  {heroCopy.cta}
                </span>
              </div>
            </div>
          )}
          {heroType === 'split' && (
            <div className="px-4 py-6 flex items-center gap-3">
              <div className="flex-1">
                <div className="text-sm font-bold leading-snug transition-colors duration-300" style={{ color: pv.text }}>
                  {heroCopy.title}
                </div>
                <div className="mt-1 text-[10px] leading-snug" style={{ color: pv.sub }}>{heroCopy.subtitle}</div>
                <div className="mt-3 flex gap-2">
                  <span className="px-3 py-1.5 text-[10px] font-semibold text-white transition-colors duration-300" style={{ backgroundColor: pv.primary, borderRadius: pv.radius }}>
                    {heroCopy.cta}
                  </span>
                  <span className="px-3 py-1.5 text-[10px] font-semibold transition-colors duration-300" style={{ color: pv.accent, border: `1px solid ${pv.accent}`, borderRadius: pv.radius }}>
                    Learn more
                  </span>
                </div>
              </div>
              <div className="w-1/3 self-stretch min-h-[3.5rem]" style={{ background: `linear-gradient(135deg, ${pv.primary}55, ${pv.accent}88)`, borderRadius: pv.radius }} />
            </div>
          )}
          {/* Feature cards */}
          <div className={`px-4 pb-4 grid gap-2 ${previewDevice === 'mobile' ? 'grid-cols-1' : 'grid-cols-3'}`}>
            {(previewTheme?.features || ['Bookings', 'Payments', 'Reports']).slice(0, 3).map((f, i) => (
              <div key={i} className="border border-black/5 p-2" style={{ backgroundColor: pv.surface, borderRadius: pv.radius }}>
                <span className="block h-1.5 w-6 rounded-full mb-1.5 transition-colors duration-300" style={{ backgroundColor: i === 1 ? pv.accent : pv.primary }} />
                <span className="text-[9px] font-medium" style={{ color: pv.text }}>{typeof f === 'string' ? f : ''}</span>
              </div>
            ))}
          </div>
          {/* Footer */}
          <div className="px-4 py-2 text-[8px] border-t border-black/5" style={{ color: pv.sub }}>
            © {new Date().getFullYear()} {previewName} · Powered by Dexo
          </div>
        </div>
      </div>
      {/* Palette strip */}
      <div className="mt-3 flex items-center justify-center gap-2">
        {[pv.primary, pv.accent, previewTheme?.colors.secondary, previewTheme?.colors.success].filter(Boolean).map((c, i) => (
          <span key={i} className="h-5 w-5 rounded-full border border-black/10 transition-colors duration-300" style={{ backgroundColor: c as string }} />
        ))}
        <span className="text-[10px] text-gray-400 ml-1">{selectedTemplate ? `${selectedTemplate.templateName} · ${selectedTemplate.style}` : 'Pick a template'}</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 py-8 px-4">
      <style jsx global>{`
        @keyframes stepIn { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: translateX(0); } }
        .step-anim { animation: stepIn 0.28s ease-out; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.3s ease-out; }
      `}</style>

      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Build your platform</h1>
          <p className="mt-2 text-gray-500">
            Every choice updates your website live — go from idea to published in about {minutesLeft <= 1 ? 'a minute' : `${minutesLeft} minutes`}.
          </p>
          {resumed && (
            <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full fade-up">
              👋 Welcome back — we restored your progress.
              <button
                className="underline"
                onClick={() => { localStorage.removeItem(DRAFT_KEY); window.location.reload(); }}
              >
                Start over
              </button>
            </div>
          )}
        </div>

        {/* Progress */}
        <div className="max-w-3xl mx-auto mb-8">
          <ol className="flex items-center">
            {STEPS.map((s, i) => (
              <li key={s.key} className={`flex items-center ${i < STEPS.length - 1 ? 'flex-1' : ''}`}>
                <button
                  onClick={() => i < step && setStep(i)}
                  title={s.title}
                  className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                    i < step ? 'text-white cursor-pointer scale-100' : i === step ? 'text-white ring-4 ring-black/5 scale-110' : 'bg-gray-200 text-gray-500'
                  }`}
                  style={i <= step ? { backgroundColor: i < step ? '#10b981' : brandPrimary } : undefined}
                >
                  {i < step ? '✓' : i + 1}
                </button>
                {i < STEPS.length - 1 && (
                  <span className="flex-1 h-0.5 mx-1 rounded transition-colors duration-500" style={{ backgroundColor: i < step ? '#10b981' : '#e5e7eb' }} />
                )}
              </li>
            ))}
          </ol>
          <div className="mt-1.5 flex justify-between items-center text-xs">
            <span className="font-semibold text-gray-900">{current.title}</span>
            <span className="flex items-center gap-2 text-gray-400">
              {saved && <span className="text-emerald-600 fade-up">Saved ✓</span>}
              ⏱ ~{minutesLeft} min remaining
            </span>
          </div>
        </div>

        {/* Split layout: wizard left, live preview right */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
          <div className="bg-white shadow-lg rounded-2xl p-6 sm:p-8">
            {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm fade-up">{error}</div>}

            <div key={current.key} className="step-anim">
              {/* Step 1 — Industry */}
              {current.key === 'industry' && (
                <div>
                  <h2 className="text-xl font-bold mb-1">What kind of business do you run?</h2>
                  <p className="text-sm text-gray-500 mb-3">This decides which modules and themes we recommend.</p>
                  {templates.length > 6 && (
                    <input
                      placeholder="🔍 Search industries…"
                      value={industrySearch}
                      onChange={(e) => setIndustrySearch(e.target.value)}
                      className="w-full sm:w-72 mb-4 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 outline-none"
                    />
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredTemplates.map((t) => (
                      <button
                        key={t.domainType}
                        onClick={() => pickIndustry(t)}
                        className={`group p-4 border-2 rounded-xl text-left transition-all duration-200 ${
                          data.domainType === t.domainType
                            ? 'border-gray-900 ring-2 ring-gray-900/20 bg-gray-50 shadow-md'
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">{t.icon || industryEmoji(t.domainType)}</span>
                          <span className="h-2 w-8 rounded-full" style={{ backgroundColor: t.colorPrimary }} />
                        </div>
                        <div className="font-semibold text-gray-900">{t.name}</div>
                        <div className="text-xs text-gray-500 mt-1">{t.tagline}</div>
                      </button>
                    ))}
                    {templates.length === 0 && (
                      <div className="col-span-full grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[...Array(6)].map((_, i) => (
                          <div key={i} className="h-28 rounded-xl bg-gray-100 animate-pulse" />
                        ))}
                      </div>
                    )}
                    {templates.length > 0 && filteredTemplates.length === 0 && (
                      <div className="col-span-full text-sm text-gray-400 p-6 text-center">
                        No match — pick the closest industry, you can customise everything later.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2 — Website template gallery (5 design families per industry) */}
              {current.key === 'theme' && (
                <div>
                  <h2 className="text-xl font-bold mb-1">Pick your website template</h2>
                  <p className="text-sm text-gray-500 mb-4">
                    Five completely different designs for your {data.domainType || 'business'} — different layout, journey and personality.
                    The preview updates as you click.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {domainTemplates.map((t) => {
                      const selected = data.templateId === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => pickTemplate(t)}
                          className={`relative rounded-xl border-2 text-left overflow-hidden transition-all duration-200 ${
                            selected ? 'border-gray-900 ring-2 ring-gray-900/20 shadow-md' : 'border-gray-200 hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5'
                          }`}
                        >
                          <TemplateThumb t={t} />
                          <div className="p-3 bg-white border-t border-gray-100">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-sm text-gray-900">{t.templateName}</span>
                              <span className="flex gap-1">
                                {[t.palette.primary, t.palette.accent, t.palette.background].map((c, i) => (
                                  <span key={i} className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: c }} />
                                ))}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">{t.description}</div>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">{t.style}</span>
                              <span className="text-[10px] text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">{t.heroType} hero</span>
                              <span className="text-[10px] text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">{t.navigationStyle} nav</span>
                              {t.premium && (
                                <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Premium</span>
                              )}
                            </div>
                          </div>
                          {selected && (
                            <span className="absolute top-2 right-2 h-6 w-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs fade-up">✓</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {selectedTemplate && (
                    <div className="mt-4 rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs text-gray-600 fade-up">
                      <span className="font-semibold text-gray-900">{selectedTemplate.templateName}</span> journey:{' '}
                      {selectedTemplate.sections.join(' → ')}
                      <span className="block mt-1 text-gray-400">
                        Fonts: {selectedTemplate.fonts[0]} / {selectedTemplate.fonts[1]} · Forms: {selectedTemplate.forms.join(', ')} · Admin: {selectedTemplate.adminTheme}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3 — Business basics */}
              {current.key === 'basics' && (
                <div className="space-y-4 max-w-xl">
                  <h2 className="text-xl font-bold">Tell us about your business</h2>
                  <p className="text-sm text-gray-500 -mt-2">Only name, email and password are required — the rest can wait.</p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Business name *</label>
                    <input
                      autoFocus
                      placeholder="e.g. Everest Fitness"
                      value={data.name}
                      onChange={(e) => setData({ ...data, name: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-gray-500 outline-none transition"
                    />
                    {data.name && (
                      <p className="mt-1 text-xs text-gray-400 fade-up">
                        Your site: <span className="font-mono text-gray-600">{slugify(data.name) || 'your-business'}.onedexo.com</span>
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone <span className="text-gray-400 font-normal">(optional)</span></label>
                      <input
                        placeholder="+977 …"
                        value={data.phone}
                        onChange={(e) => setData({ ...data, phone: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-gray-500 outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address <span className="text-gray-400 font-normal">(optional)</span></label>
                      <input
                        placeholder="City, Country"
                        value={data.address}
                        onChange={(e) => setData({ ...data, address: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-gray-500 outline-none transition"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Owner email *</label>
                    <input
                      placeholder="you@business.com"
                      type="email"
                      value={data.ownerEmail}
                      onChange={(e) => setData({ ...data, ownerEmail: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-gray-500 outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Owner password *</label>
                    <input
                      placeholder="Minimum 8 characters"
                      type="password"
                      value={data.ownerPassword}
                      onChange={(e) => setData({ ...data, ownerPassword: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-gray-500 outline-none transition"
                    />
                    {data.ownerPassword && data.ownerPassword.length < 8 && (
                      <p className="mt-1 text-xs text-amber-600 fade-up">{8 - data.ownerPassword.length} more character{8 - data.ownerPassword.length > 1 ? 's' : ''} needed</p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 4 — Branding */}
              {current.key === 'branding' && (
                <div className="space-y-5 max-w-xl">
                  <h2 className="text-xl font-bold">Make it yours</h2>
                  <p className="text-sm text-gray-500 -mt-3">
                    Colors were pre-filled from <span className="font-semibold">{selectedTemplate?.templateName || selectedTheme?.name || 'your template'}</span>.
                    Pick a preset or fine-tune — the preview updates instantly.
                  </p>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Brand presets</label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {BRAND_PRESETS.map((p) => {
                        const active = data.colorPrimary.toLowerCase() === p.primary.toLowerCase() && data.colorAccent.toLowerCase() === p.accent.toLowerCase();
                        return (
                          <button
                            key={p.name}
                            onClick={() => applyPreset(p)}
                            className={`p-2 rounded-lg border-2 text-left transition-all duration-200 ${
                              active ? 'border-gray-900 shadow' : 'border-gray-200 hover:border-gray-300 hover:-translate-y-0.5'
                            }`}
                          >
                            <span className="flex gap-1 mb-1">
                              <span className="h-4 w-4 rounded-full" style={{ backgroundColor: p.primary }} />
                              <span className="h-4 w-4 rounded-full" style={{ backgroundColor: p.accent }} />
                            </span>
                            <span className="text-[10px] font-medium text-gray-600 leading-tight block">{p.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Primary color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={data.colorPrimary}
                          onChange={(e) => setData({ ...data, colorPrimary: e.target.value })}
                          className="h-10 w-14 rounded border border-gray-300 cursor-pointer"
                        />
                        <span className="text-xs font-mono text-gray-500">{data.colorPrimary}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Accent color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={data.colorAccent}
                          onChange={(e) => setData({ ...data, colorAccent: e.target.value })}
                          className="h-10 w-14 rounded border border-gray-300 cursor-pointer"
                        />
                        <span className="text-xs font-mono text-gray-500">{data.colorAccent}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Logo URL <span className="text-gray-400">(optional)</span></label>
                    <input
                      placeholder="https://…/logo.png"
                      value={typeof data.logo === 'string' && data.logo.startsWith('http') ? data.logo : ''}
                      onChange={(e) => setData({ ...data, logo: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-gray-500 outline-none transition"
                    />
                  </div>
                </div>
              )}

              {/* Step 5 — Subdomain */}
              {current.key === 'subdomain' && (
                <div className="space-y-4 max-w-xl">
                  <h2 className="text-xl font-bold">Claim your address</h2>
                  <p className="text-sm text-gray-500 -mt-2">We suggested one from your business name — SSL, backups and CDN included.</p>
                  <div className={`flex rounded-lg border-2 overflow-hidden transition-colors ${
                    slugStatus ? (slugStatus.available ? 'border-emerald-400' : 'border-red-300') : 'border-gray-300'
                  }`}>
                    <input
                      autoFocus
                      placeholder="your-business"
                      value={data.slug}
                      onChange={(e) => setData({ ...data, slugEdited: true, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                      className="flex-1 px-3 py-2.5 outline-none font-mono text-sm"
                    />
                    <span className="bg-gray-50 px-3 py-2.5 text-gray-500 text-sm border-l border-gray-200">.onedexo.com</span>
                  </div>
                  <div className="min-h-[1.5rem] text-sm">
                    {slugChecking && <span className="text-gray-400 fade-up">Checking availability…</span>}
                    {!slugChecking && slugStatus && (
                      slugStatus.available
                        ? <span className="text-emerald-600 font-medium fade-up">✓ {data.slug}.onedexo.com is yours</span>
                        : <span className="text-red-600 fade-up">✗ {slugStatus.reason || 'Not available'}</span>
                    )}
                  </div>
                  {slugSuggestions.length > 0 && (
                    <div className="fade-up">
                      <span className="text-xs text-gray-500">Try one of these instead:</span>
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {slugSuggestions.map((s) => (
                          <button
                            key={s}
                            onClick={() => setData({ ...data, slugEdited: true, slug: s })}
                            className="px-3 py-1.5 rounded-full border border-gray-300 text-xs font-mono hover:border-gray-900 hover:bg-gray-50 transition"
                          >
                            {s}.onedexo.com
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-3 text-xs text-gray-500 pt-2">
                    <span>🔒 Free SSL</span><span>💾 Auto backup</span><span>⚡ CDN included</span>
                  </div>
                </div>
              )}

              {/* Step 6 — Plan + summary + publish */}
              {current.key === 'plan' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold">Choose your plan</h2>
                    <p className="text-sm text-gray-500">Start free — upgrade any time. Payment integration coming soon; free trial is activated by default.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {PLANS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setData({ ...data, plan: p.id })}
                        className={`relative p-4 border-2 rounded-xl text-left transition-all duration-200 ${
                          data.plan === p.id ? 'border-gray-900 bg-gray-50 shadow-md' : 'border-gray-200 hover:border-gray-300 hover:-translate-y-0.5'
                        }`}
                      >
                        {'popular' in p && p.popular && (
                          <span className="absolute -top-2.5 left-3 text-[10px] font-bold text-white px-2 py-0.5 rounded-full" style={{ backgroundColor: brandPrimary }}>
                            MOST POPULAR
                          </span>
                        )}
                        <div className="flex items-baseline justify-between">
                          <span className="font-bold text-gray-900">{p.name}</span>
                          <span className="text-sm font-semibold" style={{ color: brandPrimary }}>{p.price}<span className="text-[10px] text-gray-400 font-normal">{p.price !== 'Custom' ? '/mo' : ''}</span></span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{p.blurb}</div>
                        <ul className="mt-2 space-y-0.5">
                          {p.features.map((f) => (
                            <li key={f} className="text-[11px] text-gray-600">✓ {f}</li>
                          ))}
                        </ul>
                      </button>
                    ))}
                  </div>

                  {/* Summary */}
                  <div className="rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-4 py-2.5 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">
                      Ready to publish
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-y-2 text-sm">
                      <span className="text-gray-500">Business</span>
                      <span className="font-semibold text-gray-900 text-right">
                        {data.name || '—'} {templates.find((t) => t.domainType === data.domainType)?.icon || industryEmoji(data.domainType)}
                      </span>
                      <span className="text-gray-500">Template</span>
                      <span className="font-semibold text-gray-900 text-right">
                        {selectedTemplate ? `${selectedTemplate.templateName} (${selectedTemplate.style})` : selectedTheme?.name || '—'}
                        <span className="ml-2 inline-flex gap-1 align-middle">
                          <span className="h-3 w-3 rounded-full inline-block border border-black/10" style={{ backgroundColor: data.colorPrimary }} />
                          <span className="h-3 w-3 rounded-full inline-block border border-black/10" style={{ backgroundColor: data.colorAccent }} />
                        </span>
                      </span>
                      <span className="text-gray-500">Website</span>
                      <span className="font-mono text-right text-gray-900">{data.slug || 'your-business'}.onedexo.com</span>
                      <span className="text-gray-500">Owner</span>
                      <span className="text-right text-gray-900">{data.ownerEmail || '—'}</span>
                      <span className="text-gray-500">Plan</span>
                      <span className="font-semibold text-right text-gray-900">{data.plan}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Nav */}
            <div className="mt-8 flex justify-between items-center">
              <button onClick={prev} disabled={step === 0} className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition">
                ← Back
              </button>
              {step === STEPS.length - 1 ? (
                <button
                  onClick={submit}
                  disabled={submitting || !slugStatus?.available}
                  className="px-8 py-3 rounded-lg font-semibold text-white disabled:opacity-50 shadow-lg hover:shadow-xl transition-all"
                  style={{ backgroundColor: '#059669' }}
                >
                  {submitting ? 'Publishing…' : '🚀 Publish my platform'}
                </button>
              ) : (
                <button
                  onClick={next}
                  disabled={!stepValid}
                  className="px-8 py-2.5 rounded-lg font-semibold text-white disabled:opacity-40 shadow hover:shadow-lg transition-all"
                  style={{ backgroundColor: brandPrimary }}
                >
                  Continue →
                </button>
              )}
            </div>
          </div>

          {/* Right — persistent live preview */}
          <div className="hidden lg:block">{livePreview}</div>
        </div>

        {/* Mobile preview (below wizard) */}
        <div className="lg:hidden mt-6 max-w-md mx-auto">{livePreview}</div>
      </div>

      {/* Provisioning overlay */}
      {submitting && (
        <div className="fixed inset-0 z-50 bg-white/90 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="max-w-sm w-full text-center fade-up">
            <div className="mx-auto h-16 w-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg animate-bounce" style={{ backgroundColor: brandPrimary }}>
              <span>🚀</span>
            </div>
            <h3 className="mt-5 text-xl font-bold text-gray-900">Building {data.name || 'your platform'}…</h3>
            <ul className="mt-5 space-y-2 text-left inline-block">
              {PROVISION_STAGES.map((s, i) => (
                <li key={s} className={`flex items-center gap-2 text-sm transition-all duration-300 ${
                  i < provisionStage ? 'text-emerald-600' : i === provisionStage ? 'text-gray-900 font-semibold' : 'text-gray-300'
                }`}>
                  <span className="w-5 text-center">
                    {i < provisionStage ? '✓' : i === provisionStage ? <span className="inline-block h-3 w-3 rounded-full border-2 border-gray-400 border-t-transparent animate-spin" /> : '·'}
                  </span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
