import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/auth-context';
import { useTenant } from '../lib/tenant-context';
import { Colors, Spacing, BorderRadius, FontSize, Shadows, Motion } from '../lib/theme';
import { fitnessApi } from '../lib/api';
import QRCode from '../components/QRCode';

// Optional haptics — no-op if the module isn't in the dev client.
let Haptics: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Haptics = require('expo-haptics');
} catch {}
const tapHaptic = () => Haptics?.selectionAsync?.().catch(() => {});
const successHaptic = () => Haptics?.notificationAsync?.(Haptics.NotificationFeedbackType?.Success).catch(() => {});

const GOALS = [
  { key: 'WEIGHT_LOSS', label: 'Lose weight', icon: '🔥' },
  { key: 'MUSCLE_GAIN', label: 'Build muscle', icon: '💪' },
  { key: 'ENDURANCE', label: 'Endurance', icon: '🏃' },
  { key: 'STRENGTH', label: 'Get stronger', icon: '🏋️' },
  { key: 'FLEXIBILITY', label: 'Flexibility', icon: '🧘' },
  { key: 'GENERAL_FITNESS', label: 'Stay fit', icon: '⚡' },
];

const PAYMENT_METHODS = [
  { key: 'eSewa', label: 'eSewa', sub: 'Pay instantly', color: '#60BB46', icon: 'wallet-outline', instant: true },
  { key: 'Khalti', label: 'Khalti', sub: 'Pay instantly', color: '#5C2D91', icon: 'card-outline', instant: true },
  { key: 'Cash', label: 'Cash at counter', sub: 'Activate at the gym', color: '#0EA5E9', icon: 'cash-outline', instant: false },
];

type Step = 'welcome' | 'goals' | 'body' | 'bmi' | 'plan' | 'pay' | 'done';
const ORDER: Step[] = ['welcome', 'goals', 'body', 'bmi', 'plan', 'pay', 'done'];

function bmiCategory(bmi: number) {
  if (bmi < 18.5) return { label: 'Underweight', color: Colors.warning, msg: 'Let’s build strength and healthy mass.' };
  if (bmi < 25) return { label: 'Healthy range', color: Colors.success, msg: 'Great starting point — let’s build from here.' };
  if (bmi < 30) return { label: 'Overweight', color: Colors.warning, msg: 'A steady plan will move this in the right direction.' };
  return { label: 'High', color: Colors.error, msg: 'We’ll start gentle and progress safely with your trainer.' };
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const { tenant } = useTenant();
  const primary = tenant?.primaryColor || Colors.primary;

  const [step, setStep] = useState<Step>('welcome');
  const [member, setMember] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [membership, setMembership] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [goals, setGoals] = useState<string[]>([]);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [medical, setMedical] = useState('');

  // Step transition animation
  const fade = useRef(new Animated.Value(1)).current;
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!token) {
      router.replace('/(auth)/login');
      return;
    }
    (async () => {
      const [m, p] = await Promise.all([
        fitnessApi.members.me(),
        fitnessApi.plans.list({ active: 'true' }),
      ]);
      if (m.data) {
        setMember(m.data);
        if (m.data.height) setHeight(String(m.data.height));
        if (m.data.weight) setWeight(String(m.data.weight));
        if (m.data.goals) setGoals(String(m.data.goals).split(',').filter(Boolean));
      }
      if (p.data) setPlans(Array.isArray(p.data) ? p.data : p.data?.items ?? p.data?.data ?? []);
      setLoading(false);
    })();
  }, [token]);

  function goTo(next: Step) {
    tapHaptic();
    Animated.parallel([
      Animated.timing(fade, { toValue: 0, duration: Motion.fast, useNativeDriver: true }),
      Animated.timing(slide, { toValue: -24, duration: Motion.fast, useNativeDriver: true }),
    ]).start(() => {
      setStep(next);
      slide.setValue(24);
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: Motion.base, useNativeDriver: true }),
        Animated.timing(slide, { toValue: 0, duration: Motion.base, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    });
  }

  const stepIndex = ORDER.indexOf(step);
  const bmi = height && weight ? Number(weight) / Math.pow(Number(height) / 100, 2) : 0;

  const toggleGoal = (k: string) => {
    tapHaptic();
    setGoals((g) => (g.includes(k) ? g.filter((x) => x !== k) : [...g, k]));
  };

  async function saveBodyAndReveal() {
    setSaving(true);
    const res = await fitnessApi.members.updateMe({
      goals: goals.join(','),
      height: height ? parseFloat(height) : undefined,
      weight: weight ? parseFloat(weight) : undefined,
      medicalConditions: medical || undefined,
    });
    setSaving(false);
    if (res.error) return Alert.alert('Could not save', res.error);
    goTo('bmi');
  }

  async function payAndActivate(method: (typeof PAYMENT_METHODS)[number]) {
    if (!member?.id || !selectedPlan?.id) return;
    setSaving(true);
    // 1. Reserve the membership (created PENDING).
    const created = await fitnessApi.memberships.create({ memberId: member.id, planId: selectedPlan.id });
    if (created.error || !created.data?.id) {
      setSaving(false);
      return Alert.alert('Could not reserve plan', created.error || 'Please try again.');
    }
    let ms = created.data;

    // 2. Instant methods (eSewa/Khalti sandbox) settle immediately; cash stays PENDING.
    if (method.instant) {
      const ref = `${method.key.toUpperCase()}-${Date.now()}`;
      const act = await fitnessApi.memberships.activatePayment(ms.id, ref, method.key);
      if (act.error) {
        setSaving(false);
        return Alert.alert('Payment failed', act.error);
      }
      const fresh = await fitnessApi.memberships.get(ms.id);
      if (fresh.data) ms = fresh.data;
    }
    setSaving(false);
    setMembership(ms);
    successHaptic();
    goTo('done');
  }

  async function finish() {
    if (user?.id) await SecureStore.setItemAsync(`onboarded_${user.id}`, '1').catch(() => {});
    router.replace('/(tabs)');
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Progress bar (hidden on welcome & done for a cleaner hero) */}
      {step !== 'welcome' && step !== 'done' && (
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(stepIndex / (ORDER.length - 1)) * 100}%`, backgroundColor: primary }]} />
          </View>
          <Text style={styles.progressLabel}>Step {stepIndex} of {ORDER.length - 2}</Text>
        </View>
      )}

      <Animated.View style={{ flex: 1, opacity: fade, transform: [{ translateX: slide }] }}>
        {step === 'welcome' && (
          <Welcome primary={primary} name={user?.firstName} gym={tenant?.name} onStart={() => goTo('goals')} />
        )}

        {step === 'goals' && (
          <ScrollView contentContainerStyle={styles.body}>
            <Text style={styles.h1}>What brings you in?</Text>
            <Text style={styles.sub}>Pick everything that fits. This shapes your plan.</Text>
            <View style={styles.goalGrid}>
              {GOALS.map((g) => {
                const active = goals.includes(g.key);
                return (
                  <TouchableOpacity
                    key={g.key}
                    activeOpacity={0.85}
                    style={[styles.goalCard, active && { borderColor: primary, backgroundColor: primary + '10' }]}
                    onPress={() => toggleGoal(g.key)}
                  >
                    <Text style={styles.goalIcon}>{g.icon}</Text>
                    <Text style={[styles.goalLabel, active && { color: primary, fontWeight: '700' }]}>{g.label}</Text>
                    {active && <Ionicons name="checkmark-circle" size={18} color={primary} style={styles.goalCheck} />}
                  </TouchableOpacity>
                );
              })}
            </View>
            <PrimaryButton label="Continue" color={primary} disabled={goals.length === 0} onPress={() => goTo('body')} />
          </ScrollView>
        )}

        {step === 'body' && (
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <Text style={styles.h1}>A few basics</Text>
            <Text style={styles.sub}>So we can track progress and keep you safe.</Text>

            <View style={styles.row}>
              <Field label="Height (cm)" value={height} onChange={setHeight} placeholder="170" />
              <View style={{ width: Spacing.md }} />
              <Field label="Weight (kg)" value={weight} onChange={setWeight} placeholder="65" />
            </View>

            <Text style={styles.label}>Anything we should know? (optional)</Text>
            <TextInput
              style={[styles.input, { height: 84, textAlignVertical: 'top' }]}
              value={medical}
              onChangeText={setMedical}
              multiline
              placeholder="Injuries, allergies, conditions your trainer should know…"
              placeholderTextColor={Colors.textLight}
            />

            <PrimaryButton
              label={saving ? 'Saving…' : 'See my starting point'}
              color={primary}
              disabled={!height || !weight || saving}
              onPress={saveBodyAndReveal}
            />
          </ScrollView>
        )}

        {step === 'bmi' && <BmiReveal primary={primary} bmi={bmi} onNext={() => goTo('plan')} />}

        {step === 'plan' && (
          <ScrollView contentContainerStyle={styles.body}>
            <Text style={styles.h1}>Choose your plan</Text>
            <Text style={styles.sub}>Unlock workouts, classes, and your trainer.</Text>
            {plans.length === 0 && (
              <EmptyState icon="pricetags-outline" title="No plans yet" msg="Your gym hasn’t published plans. You can pick one later." />
            )}
            {plans.map((p) => {
              const selected = selectedPlan?.id === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  activeOpacity={0.9}
                  onPress={() => { tapHaptic(); setSelectedPlan(p); }}
                  style={[styles.planCard, selected && { borderColor: primary, borderWidth: 2 }]}
                >
                  <View style={styles.planTop}>
                    <Text style={styles.planName}>{p.name}</Text>
                    <Text style={[styles.planPrice, { color: primary }]}>NPR {p.totalWithVat ?? p.priceNpr}</Text>
                  </View>
                  {!!p.description && <Text style={styles.planDesc}>{p.description}</Text>}
                  <View style={styles.planFeatures}>
                    <Chip icon="calendar-outline" label={`${p.durationDays} days`} />
                    {p.includesTrainer && <Chip icon="barbell-outline" label="Trainer" />}
                    {p.includesClasses && <Chip icon="people-outline" label="Classes" />}
                    {p.includesDietPlan && <Chip icon="nutrition-outline" label="Diet plan" />}
                  </View>
                  {selected && (
                    <View style={[styles.planSelected, { backgroundColor: primary }]}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
            <PrimaryButton label="Continue to payment" color={primary} disabled={!selectedPlan} onPress={() => goTo('pay')} />
          </ScrollView>
        )}

        {step === 'pay' && selectedPlan && (
          <ScrollView contentContainerStyle={styles.body}>
            <Text style={styles.h1}>How would you like to pay?</Text>
            <Text style={styles.sub}>
              {selectedPlan.name} · <Text style={{ color: primary, fontWeight: '700' }}>NPR {selectedPlan.totalWithVat ?? selectedPlan.priceNpr}</Text>
            </Text>
            {PAYMENT_METHODS.map((m) => (
              <TouchableOpacity
                key={m.key}
                activeOpacity={0.9}
                disabled={saving}
                onPress={() => payAndActivate(m)}
                style={styles.payRow}
              >
                <View style={[styles.payIcon, { backgroundColor: m.color + '18' }]}>
                  <Ionicons name={m.icon as any} size={22} color={m.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.payLabel}>{m.label}</Text>
                  <Text style={styles.paySub}>{m.sub}</Text>
                </View>
                {saving ? <ActivityIndicator color={primary} /> : <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />}
              </TouchableOpacity>
            ))}
            <Text style={styles.payNote}>eSewa & Khalti run in sandbox for now. Cash keeps your plan reserved until you pay at the counter.</Text>
          </ScrollView>
        )}

        {step === 'done' && (
          <SuccessScreen
            primary={primary}
            name={user?.firstName}
            gym={tenant?.name}
            plan={selectedPlan}
            membership={membership}
            onFinish={finish}
          />
        )}
      </Animated.View>
    </View>
  );
}

/* ---------- Sub-screens & components ---------- */

function Welcome({ primary, name, gym, onStart }: any) {
  return (
    <View style={[styles.welcome, { backgroundColor: primary }]}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={styles.welcomeKicker}>{gym || 'Your gym'}</Text>
        <Text style={styles.welcomeTitle}>Welcome{name ? `, ${name}` : ''} 👋</Text>
        <Text style={styles.welcomeSub}>Let’s set up your fitness journey. Two minutes, and you’re training.</Text>
      </View>
      <TouchableOpacity style={styles.welcomeBtn} activeOpacity={0.9} onPress={onStart}>
        <Text style={[styles.welcomeBtnText, { color: primary }]}>Get started</Text>
        <Ionicons name="arrow-forward" size={20} color={primary} />
      </TouchableOpacity>
    </View>
  );
}

function BmiReveal({ primary, bmi, onNext }: any) {
  const scale = useRef(new Animated.Value(0.6)).current;
  const count = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState('0.0');
  const cat = bmiCategory(bmi || 22);

  useEffect(() => {
    Animated.spring(scale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }).start();
    const id = count.addListener(({ value }) => setShown((value * (bmi || 0)).toFixed(1)));
    Animated.timing(count, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    return () => count.removeListener(id);
  }, [bmi]);

  return (
    <View style={styles.bmiWrap}>
      <Text style={styles.h1}>Here’s your starting point</Text>
      <Text style={styles.sub}>We’ll measure everything from today.</Text>
      <Animated.View style={[styles.bmiRing, { borderColor: cat.color, transform: [{ scale }] }]}>
        <Text style={styles.bmiLabel}>BMI</Text>
        <Text style={[styles.bmiValue, { color: cat.color }]}>{shown}</Text>
        <View style={[styles.bmiBadge, { backgroundColor: cat.color + '18' }]}>
          <Text style={[styles.bmiBadgeText, { color: cat.color }]}>{cat.label}</Text>
        </View>
      </Animated.View>
      <Text style={styles.bmiMsg}>{cat.msg}</Text>
      <PrimaryButton label="Let’s pick a plan" color={primary} onPress={onNext} />
    </View>
  );
}

function SuccessScreen({ primary, name, gym, plan, membership, onFinish }: any) {
  const pending = membership?.status && String(membership.status).toUpperCase() !== 'ACTIVE';
  const cardScale = useRef(new Animated.Value(0.85)).current;
  useEffect(() => {
    Animated.spring(cardScale, { toValue: 1, friction: 7, tension: 70, useNativeDriver: true }).start();
    successHaptic();
  }, []);
  const qrValue = membership?.qrCode || membership?.id || '';

  return (
    <View style={styles.successWrap}>
      <Confetti color={primary} />
      <View style={{ alignItems: 'center', marginTop: Spacing.xl }}>
        <View style={[styles.successCheck, { backgroundColor: pending ? Colors.warning : Colors.success }]}>
          <Ionicons name={pending ? 'time-outline' : 'checkmark'} size={40} color="#fff" />
        </View>
        <Text style={styles.successTitle}>{pending ? 'Almost there!' : `You’re in${name ? `, ${name}` : ''}! 🎉`}</Text>
        <Text style={styles.successSub}>
          {pending ? 'Pay at the counter to activate your membership.' : 'Your membership is active. Show this QR to check in.'}
        </Text>
      </View>

      {/* Apple-Wallet-style membership card */}
      <Animated.View style={[styles.walletCard, { backgroundColor: primary, transform: [{ scale: cardScale }] }]}>
        <View style={styles.walletTop}>
          <Text style={styles.walletGym}>{gym || 'Dexo Fitness'}</Text>
          <View style={[styles.walletStatus, { backgroundColor: pending ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.9)' }]}>
            <Text style={[styles.walletStatusText, { color: pending ? '#fff' : primary }]}>{pending ? 'PENDING' : 'ACTIVE'}</Text>
          </View>
        </View>
        <Text style={styles.walletName}>{name || 'Member'}</Text>
        <Text style={styles.walletPlan}>{plan?.name || 'Membership'}</Text>
        <View style={styles.walletQr}>
          <QRCode value={qrValue} size={132} color="#0B0F19" background="#FFFFFF" />
        </View>
      </Animated.View>

      <View style={{ paddingHorizontal: Spacing.lg, width: '100%' }}>
        <PrimaryButton label="Go to my dashboard" color={primary} onPress={onFinish} />
      </View>
    </View>
  );
}

/** Lightweight confetti using only Animated (no native dep). */
function Confetti({ color }: { color: string }) {
  const W = Dimensions.get('window').width;
  const pieces = useRef(
    Array.from({ length: 16 }).map((_, i) => ({
      x: (i / 16) * W,
      delay: (i % 6) * 90,
      color: [color, Colors.move, Colors.streak, Colors.success, Colors.stand][i % 5],
      anim: new Animated.Value(0),
    })),
  ).current;

  useEffect(() => {
    pieces.forEach((p) => {
      Animated.timing(p.anim, { toValue: 1, duration: 1400, delay: p.delay, easing: Easing.in(Easing.quad), useNativeDriver: true }).start();
    });
  }, []);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: p.x,
            top: -20,
            width: 8,
            height: 14,
            borderRadius: 2,
            backgroundColor: p.color,
            opacity: p.anim.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateY: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, 520] }) },
              { rotate: p.anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${(i % 2 ? 1 : -1) * 320}deg`] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

function PrimaryButton({ label, color, onPress, disabled }: any) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      disabled={disabled}
      onPress={onPress}
      style={[styles.primaryBtn, { backgroundColor: color }, disabled && { opacity: 0.45 }]}
    >
      <Text style={styles.primaryBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

function Field({ label, value, onChange, placeholder }: any) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        placeholder={placeholder}
        placeholderTextColor={Colors.textLight}
      />
    </View>
  );
}

function Chip({ icon, label }: any) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon} size={13} color={Colors.textSecondary} />
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

function EmptyState({ icon, title, msg }: any) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={44} color={Colors.textLight} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMsg}>{msg}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  body: { padding: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.xxl },

  progressWrap: { paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  progressTrack: { height: 6, backgroundColor: Colors.surfaceAlt, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  progressLabel: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 6, fontWeight: '600' },

  h1: { fontSize: FontSize.title, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  sub: { fontSize: FontSize.md, color: Colors.textSecondary, marginTop: 6, marginBottom: Spacing.lg },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text, marginTop: Spacing.md, marginBottom: Spacing.sm },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  row: { flexDirection: 'row' },

  // Welcome
  welcome: { flex: 1, padding: Spacing.xl, paddingBottom: Spacing.xxl },
  welcomeKicker: { color: 'rgba(255,255,255,0.85)', fontSize: FontSize.md, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  welcomeTitle: { color: '#fff', fontSize: FontSize.display, fontWeight: '800', marginTop: Spacing.sm, letterSpacing: -1 },
  welcomeSub: { color: 'rgba(255,255,255,0.9)', fontSize: FontSize.lg, marginTop: Spacing.md, lineHeight: 26 },
  welcomeBtn: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.md + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadows.md,
  },
  welcomeBtnText: { fontSize: FontSize.lg, fontWeight: '800' },

  // Goals
  goalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  goalCard: {
    width: '31.5%',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  goalIcon: { fontSize: 28 },
  goalLabel: { fontSize: FontSize.xs, color: Colors.text, textAlign: 'center', marginTop: 6, fontWeight: '600' },
  goalCheck: { position: 'absolute', top: 6, right: 6 },

  // Buttons
  primaryBtn: {
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.md + 2,
    alignItems: 'center',
    marginTop: Spacing.xl,
    ...Shadows.sm,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: FontSize.md },

  // BMI
  bmiWrap: { flex: 1, padding: Spacing.lg, alignItems: 'center', justifyContent: 'center' },
  bmiRing: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.xl,
    backgroundColor: Colors.surface,
    ...Shadows.md,
  },
  bmiLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '700', letterSpacing: 2 },
  bmiValue: { fontSize: 56, fontWeight: '800', letterSpacing: -1 },
  bmiBadge: { paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: BorderRadius.full, marginTop: 4 },
  bmiBadgeText: { fontSize: FontSize.sm, fontWeight: '700' },
  bmiMsg: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: Spacing.lg },

  // Plans
  planCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl2,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  planTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planName: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  planPrice: { fontSize: FontSize.lg, fontWeight: '800' },
  planDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4 },
  planFeatures: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
  planSelected: { position: 'absolute', top: 14, right: 14, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },

  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.surfaceAlt, paddingHorizontal: Spacing.sm, paddingVertical: 5, borderRadius: BorderRadius.full },
  chipText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600' },

  // Payment
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  payIcon: { width: 46, height: 46, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  payLabel: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  paySub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  payNote: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: Spacing.md, lineHeight: 18 },

  // Success
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingBottom: Spacing.xl },
  successCheck: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', ...Shadows.md },
  successTitle: { fontSize: FontSize.title, fontWeight: '800', color: Colors.text, marginTop: Spacing.md, letterSpacing: -0.5, textAlign: 'center' },
  successSub: { fontSize: FontSize.md, color: Colors.textSecondary, marginTop: 6, textAlign: 'center', paddingHorizontal: Spacing.xl },
  walletCard: {
    width: '86%',
    borderRadius: BorderRadius.hero,
    padding: Spacing.lg,
    ...Shadows.lg,
  },
  walletTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  walletGym: { color: '#fff', fontSize: FontSize.md, fontWeight: '800' },
  walletStatus: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.full },
  walletStatusText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  walletName: { color: '#fff', fontSize: FontSize.xxl, fontWeight: '800', marginTop: Spacing.lg },
  walletPlan: { color: 'rgba(255,255,255,0.85)', fontSize: FontSize.sm, marginTop: 2 },
  walletQr: { alignSelf: 'center', marginTop: Spacing.lg },

  // Empty
  empty: { alignItems: 'center', paddingVertical: Spacing.xl },
  emptyTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, marginTop: Spacing.md },
  emptyMsg: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4, textAlign: 'center', paddingHorizontal: Spacing.lg },
});
