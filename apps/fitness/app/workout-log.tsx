import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@dexo/mobile-core/lib/auth-context';
import { useTenant } from '@dexo/mobile-core/lib/tenant-context';
import { Colors, Spacing, BorderRadius, FontSize, Shadows } from '@dexo/mobile-core/lib/theme';
import { fitnessApi } from '@dexo/mobile-core/lib/api';
import Confetti from '@dexo/mobile-core/components/Confetti';

const { width: SCREEN_W } = Dimensions.get('window');

let Haptics: any = null;
try { Haptics = require('expo-haptics'); } catch {}
const tick = () => Haptics?.selectionAsync?.().catch(() => {});
const done = () => Haptics?.notificationAsync?.(Haptics.NotificationFeedbackType?.Success).catch(() => {});

type SetEntry = { reps: number; weight: number; complete: boolean };

export default function WorkoutPlayer() {
  const router = useRouter();
  const { token } = useAuth();
  const { tenant } = useTenant();
  const primary = tenant?.primaryColor || Colors.primary;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [sets, setSets] = useState<Record<string, SetEntry[]>>({});
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [startedAt] = useState(Date.now());

  // Rest timer
  const [rest, setRest] = useState(0);
  const restRef = useRef<any>(null);

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!token) { router.replace('/(auth)/login'); return; }
    (async () => {
      const res = await fitnessApi.workoutPlans.list({ status: 'ACTIVE' });
      const plans = Array.isArray(res.data) ? res.data : res.data?.items ?? res.data?.data ?? [];
      const p = plans[0];
      if (p) {
        setPlan(p);
        const day = p.workoutDays?.find((d: any) => !d.isRestDay) || p.workoutDays?.[0];
        const exs = (day?.exercises || []).filter(Boolean);
        setExercises(exs);
        const initial: Record<string, SetEntry[]> = {};
        exs.forEach((ex: any) => {
          const n = ex.sets ?? 3;
          initial[ex.id] = Array.from({ length: n }).map(() => ({ reps: ex.reps ?? 10, weight: Number(ex.weight) || 0, complete: false }));
        });
        setSets(initial);
      }
      setLoading(false);
    })();
    return () => clearInterval(restRef.current);
  }, [token]);

  function startRest(seconds: number) {
    clearInterval(restRef.current);
    setRest(seconds);
    restRef.current = setInterval(() => {
      setRest((r) => {
        if (r <= 1) { clearInterval(restRef.current); return 0; }
        return r - 1;
      });
    }, 1000);
  }

  function toggleSet(exId: string, i: number, restSeconds: number) {
    tick();
    setSets((prev) => {
      const copy = { ...prev };
      const arr = [...(copy[exId] || [])];
      arr[i] = { ...arr[i], complete: !arr[i].complete };
      copy[exId] = arr;
      if (arr[i].complete) startRest(restSeconds);
      return copy;
    });
  }

  function editSet(exId: string, i: number, field: 'reps' | 'weight', delta: number) {
    setSets((prev) => {
      const copy = { ...prev };
      const arr = [...(copy[exId] || [])];
      arr[i] = { ...arr[i], [field]: Math.max(0, (arr[i][field] || 0) + delta) };
      copy[exId] = arr;
      return copy;
    });
  }

  function goTo(i: number) {
    const clamped = Math.max(0, Math.min(exercises.length - 1, i));
    setIndex(clamped);
    scrollRef.current?.scrollTo({ x: clamped * SCREEN_W, animated: true });
  }

  const totalSets = Object.values(sets).reduce((s, arr) => s + arr.length, 0);
  const completedSets = Object.values(sets).reduce((s, arr) => s + arr.filter((x) => x.complete).length, 0);
  const progress = totalSets ? completedSets / totalSets : 0;
  const totalVolume = Object.values(sets).reduce((s, arr) => s + arr.filter((x) => x.complete).reduce((a, x) => a + x.reps * x.weight, 0), 0);

  async function finish() {
    const memberRes = await fitnessApi.members.me();
    if (!memberRes.data) return Alert.alert('Error', 'Member not found');
    setSubmitting(true);
    const durationMin = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
    const exerciseLogs = exercises.map((ex) => {
      const arr = sets[ex.id] || [];
      const completed = arr.filter((x) => x.complete);
      return {
        exerciseId: ex.id,
        setsCompleted: completed.length,
        repsCompleted: completed.reduce((a, x) => a + x.reps, 0),
        weightUsed: completed.length ? Math.max(...completed.map((x) => x.weight)) : 0,
      };
    });
    const est = Math.round(durationMin * 7); // rough kcal estimate
    const res = await fitnessApi.workoutLogs.create({
      memberId: memberRes.data.id,
      planId: plan?.id,
      workoutDate: new Date().toISOString(),
      duration: durationMin,
      caloriesBurned: est,
      rating: 5,
      notes: '',
      exerciseLogs,
    });
    setSubmitting(false);
    if (res.error) return Alert.alert('Could not save', res.error);
    done();
    setFinished(true);
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={primary} /></View>;
  }

  if (!plan || exercises.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="barbell-outline" size={56} color={Colors.textLight} />
        <Text style={styles.emptyTitle}>No workout assigned yet</Text>
        <Text style={styles.emptyMsg}>Your trainer hasn’t set a plan. Check back soon or message your coach.</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.primaryBtn, { backgroundColor: primary, marginTop: Spacing.lg }]}>
          <Text style={styles.primaryBtnText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (finished) {
    const durationMin = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
    return (
      <View style={[styles.container, { justifyContent: 'space-between', paddingBottom: Spacing.xl }]}>
        <Confetti />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.lg }}>
          <View style={[styles.successBadge, { backgroundColor: Colors.success }]}>
            <Ionicons name="checkmark" size={44} color="#fff" />
          </View>
          <Text style={styles.successTitle}>Workout complete! 🎉</Text>
          <Text style={styles.successSub}>Logged and counted toward your week.</Text>
          <View style={styles.summaryCard}>
            <Summary label="Duration" value={`${durationMin} min`} />
            <Summary label="Sets done" value={`${completedSets}`} />
            <Summary label="Volume" value={`${Math.round(totalVolume)} kg`} />
          </View>
        </View>
        <View style={{ paddingHorizontal: Spacing.lg }}>
          <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={[styles.primaryBtn, { backgroundColor: primary }]}>
            <Text style={styles.primaryBtnText}>Back to home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const allDone = completedSets === totalSets;

  return (
    <View style={styles.container}>
      {/* Top bar + progress */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={26} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.topTrack}>
          <View style={[styles.topFill, { width: `${progress * 100}%`, backgroundColor: primary }]} />
        </View>
        <Text style={styles.topCount}>{index + 1}/{exercises.length}</Text>
      </View>

      {/* Rest timer banner */}
      {rest > 0 && (
        <View style={[styles.restBanner, { backgroundColor: primary }]}>
          <Ionicons name="timer-outline" size={18} color="#fff" />
          <Text style={styles.restText}>Rest · {rest}s</Text>
          <TouchableOpacity onPress={() => { clearInterval(restRef.current); setRest(0); }}>
            <Text style={styles.restSkip}>Skip</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Swipeable exercise pages */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))}
      >
        {exercises.map((ex) => {
          const restSeconds = ex.restSeconds ?? ex.rest ?? 60;
          return (
            <ScrollView key={ex.id} style={{ width: SCREEN_W }} contentContainerStyle={styles.page}>
              <View style={[styles.exImage, { backgroundColor: primary + '12' }]}>
                <Ionicons name="barbell" size={64} color={primary} />
              </View>
              <Text style={styles.exName}>{ex.name}</Text>
              <Text style={styles.exMuscle}>{ex.targetMuscle || ex.muscleGroup || 'Full body'} · Target {ex.reps ?? 10} reps</Text>

              <View style={styles.setHeader}>
                <Text style={[styles.setCol, { flex: 0.6 }]}>SET</Text>
                <Text style={styles.setCol}>KG</Text>
                <Text style={styles.setCol}>REPS</Text>
                <Text style={[styles.setCol, { flex: 0.6, textAlign: 'right' }]}>✓</Text>
              </View>

              {(sets[ex.id] || []).map((s, i) => (
                <View key={i} style={[styles.setRow, s.complete && { backgroundColor: Colors.successBg }]}>
                  <Text style={[styles.setNum, { flex: 0.6 }]}>{i + 1}</Text>
                  <Stepper value={s.weight} onDec={() => editSet(ex.id, i, 'weight', -2.5)} onInc={() => editSet(ex.id, i, 'weight', 2.5)} />
                  <Stepper value={s.reps} onDec={() => editSet(ex.id, i, 'reps', -1)} onInc={() => editSet(ex.id, i, 'reps', 1)} />
                  <TouchableOpacity style={{ flex: 0.6, alignItems: 'flex-end' }} onPress={() => toggleSet(ex.id, i, restSeconds)}>
                    <View style={[styles.check, s.complete && { backgroundColor: Colors.success, borderColor: Colors.success }]}>
                      {s.complete && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </View>
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                style={styles.addSet}
                onPress={() => setSets((prev) => ({ ...prev, [ex.id]: [...(prev[ex.id] || []), { reps: ex.reps ?? 10, weight: Number(ex.weight) || 0, complete: false }] }))}
              >
                <Ionicons name="add" size={18} color={primary} />
                <Text style={[styles.addSetText, { color: primary }]}>Add set</Text>
              </TouchableOpacity>
            </ScrollView>
          );
        })}
      </ScrollView>

      {/* Footer nav / complete */}
      <View style={styles.footer}>
        {index > 0 && (
          <TouchableOpacity style={styles.navBtn} onPress={() => goTo(index - 1)}>
            <Ionicons name="chevron-back" size={22} color={Colors.text} />
          </TouchableOpacity>
        )}
        {index < exercises.length - 1 ? (
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: primary, flex: 1 }]} onPress={() => goTo(index + 1)}>
            <Text style={styles.primaryBtnText}>Next exercise</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: allDone ? Colors.success : primary, flex: 1 }]}
            onPress={finish}
            disabled={submitting}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>{allDone ? 'Complete workout 🎉' : 'Finish workout'}</Text>}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function Stepper({ value, onInc, onDec }: any) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity onPress={onDec} style={styles.stepBtn}><Ionicons name="remove" size={16} color={Colors.textSecondary} /></TouchableOpacity>
      <Text style={styles.stepValue}>{value}</Text>
      <TouchableOpacity onPress={onInc} style={styles.stepBtn}><Ionicons name="add" size={16} color={Colors.textSecondary} /></TouchableOpacity>
    </View>
  );
}

function Summary({ label, value }: any) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl, backgroundColor: Colors.background },

  topBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.sm },
  topTrack: { flex: 1, height: 6, backgroundColor: Colors.surfaceAlt, borderRadius: 3, overflow: 'hidden' },
  topFill: { height: 6, borderRadius: 3 },
  topCount: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary },

  restBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginHorizontal: Spacing.lg, borderRadius: BorderRadius.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },
  restText: { color: '#fff', fontWeight: '700', flex: 1 },
  restSkip: { color: '#fff', fontWeight: '700', opacity: 0.9 },

  page: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },
  exImage: { height: 180, borderRadius: BorderRadius.xl2, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.sm },
  exName: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text, marginTop: Spacing.lg, letterSpacing: -0.5 },
  exMuscle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4 },

  setHeader: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.lg, paddingHorizontal: Spacing.sm },
  setCol: { flex: 1, fontSize: FontSize.xs, fontWeight: '800', color: Colors.textLight, letterSpacing: 1, textAlign: 'center' },
  setRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm, borderRadius: BorderRadius.md, marginTop: Spacing.sm },
  setNum: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  check: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },

  stepper: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  stepBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, minWidth: 30, textAlign: 'center' },

  addSet: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: Spacing.md, paddingVertical: Spacing.sm },
  addSetText: { fontWeight: '700', fontSize: FontSize.sm },

  footer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.lg, paddingBottom: Spacing.xl, backgroundColor: Colors.surface, ...Shadows.md },
  navBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  primaryBtn: { borderRadius: BorderRadius.full, paddingVertical: Spacing.md + 2, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: FontSize.md },

  emptyTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text, marginTop: Spacing.md },
  emptyMsg: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', marginTop: 6, paddingHorizontal: Spacing.lg },

  successBadge: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', ...Shadows.md },
  successTitle: { fontSize: FontSize.title, fontWeight: '800', color: Colors.text, marginTop: Spacing.lg, letterSpacing: -0.5 },
  successSub: { fontSize: FontSize.md, color: Colors.textSecondary, marginTop: 6 },
  summaryCard: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: BorderRadius.xl2, padding: Spacing.lg, marginTop: Spacing.xl, width: '100%', ...Shadows.sm },
  summaryValue: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  summaryLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
});
