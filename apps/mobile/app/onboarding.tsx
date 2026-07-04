import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/auth-context';
import { useTenant } from '../lib/tenant-context';
import { Colors, Spacing, BorderRadius, FontSize } from '../lib/theme';
import { fitnessApi } from '../lib/api';

const GOALS = [
  { key: 'WEIGHT_LOSS', label: 'Lose weight', icon: '🔥' },
  { key: 'MUSCLE_GAIN', label: 'Build muscle', icon: '💪' },
  { key: 'ENDURANCE', label: 'Improve endurance', icon: '🏃' },
  { key: 'FLEXIBILITY', label: 'Flexibility', icon: '🧘' },
  { key: 'GENERAL_FITNESS', label: 'Stay fit', icon: '⚡' },
  { key: 'STRENGTH', label: 'Get stronger', icon: '🏋️' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const { tenant } = useTenant();
  const primary = tenant?.primaryColor || Colors.primary;

  const [step, setStep] = useState(1);
  const [member, setMember] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [goals, setGoals] = useState<string[]>([]);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [medical, setMedical] = useState('');

  useEffect(() => {
    if (!token) { router.replace('/(auth)/login'); return; }
    (async () => {
      const [m, p] = await Promise.all([
        fitnessApi.members.me(),
        fitnessApi.plans.list({ active: 'true' }),
      ]);
      if (m.data) setMember(m.data);
      if (p.data) setPlans(Array.isArray(p.data) ? p.data : p.data?.items ?? []);
      setLoading(false);
    })();
  }, [token]);

  const toggleGoal = (k: string) =>
    setGoals((g) => (g.includes(k) ? g.filter((x) => x !== k) : [...g, k]));

  async function saveProfile() {
    setSaving(true);
    const res = await fitnessApi.members.updateMe({
      goals: goals.join(','),
      height: height ? parseFloat(height) : undefined,
      weight: weight ? parseFloat(weight) : undefined,
      medicalConditions: medical || undefined,
    });
    setSaving(false);
    if (res.error) return Alert.alert('Error', res.error);
    setStep(2);
  }

  async function subscribe(planId: string) {
    if (!member?.id) return Alert.alert('Error', 'Member profile not found.');
    setSaving(true);
    const res = await fitnessApi.memberships.create({ memberId: member.id, planId });
    setSaving(false);
    if (res.error) return Alert.alert('Error', res.error);
    Alert.alert(
      'Almost there!',
      'Your plan is reserved. Complete payment to activate your membership.',
      [{ text: 'Go to app', onPress: finish }],
    );
  }

  async function finish() {
    if (user?.id) await SecureStore.setItemAsync(`onboarded_${user.id}`, '1').catch(() => {});
    router.replace('/(tabs)');
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={primary} /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.progress, { backgroundColor: primary }]}>
        <Text style={styles.progressText}>Step {step} of 2</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: step === 1 ? '50%' : '100%' }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
        {step === 1 ? (
          <>
            <Text style={styles.heading}>Welcome, {user?.firstName}! 👋</Text>
            <Text style={styles.sub}>Let’s set up your fitness profile.</Text>

            <Text style={styles.label}>What are your goals?</Text>
            <View style={styles.goalGrid}>
              {GOALS.map((g) => {
                const active = goals.includes(g.key);
                return (
                  <TouchableOpacity
                    key={g.key}
                    style={[styles.goalCard, active && { borderColor: primary, backgroundColor: primary + '12' }]}
                    onPress={() => toggleGoal(g.key)}
                  >
                    <Text style={styles.goalIcon}>{g.icon}</Text>
                    <Text style={[styles.goalLabel, active && { color: primary, fontWeight: '700' }]}>{g.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Height (cm)</Text>
                <TextInput style={styles.input} value={height} onChangeText={setHeight} keyboardType="numeric" placeholder="170" />
              </View>
              <View style={{ flex: 1, marginLeft: Spacing.md }}>
                <Text style={styles.label}>Weight (kg)</Text>
                <TextInput style={styles.input} value={weight} onChangeText={setWeight} keyboardType="numeric" placeholder="65" />
              </View>
            </View>

            <Text style={styles.label}>Medical conditions (optional)</Text>
            <TextInput style={[styles.input, { height: 72 }]} value={medical} onChangeText={setMedical} multiline placeholder="Injuries, allergies, conditions your trainer should know…" />

            <TouchableOpacity style={[styles.btn, { backgroundColor: primary }]} onPress={saveProfile} disabled={saving}>
              <Text style={styles.btnText}>{saving ? 'Saving…' : 'Continue'}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.heading}>Choose your plan</Text>
            <Text style={styles.sub}>Pick a membership to unlock workouts, classes and more.</Text>

            {plans.length === 0 && (
              <Text style={styles.empty}>No plans available yet. You can pick one later in the app.</Text>
            )}
            {plans.map((p) => (
              <View key={p.id} style={styles.planCard}>
                <View style={styles.planTop}>
                  <Text style={styles.planName}>{p.name}</Text>
                  <Text style={[styles.planPrice, { color: primary }]}>NPR {p.totalWithVat}</Text>
                </View>
                {!!p.description && <Text style={styles.planDesc}>{p.description}</Text>}
                <View style={styles.planFeatures}>
                  <Text style={styles.feature}>📅 {p.durationDays} days</Text>
                  {p.includesTrainer && <Text style={styles.feature}>✓ Trainer</Text>}
                  {p.includesClasses && <Text style={styles.feature}>✓ Classes</Text>}
                  {p.includesDietPlan && <Text style={styles.feature}>✓ Diet plan</Text>}
                </View>
                <TouchableOpacity style={[styles.btn, { backgroundColor: primary, marginTop: Spacing.sm }]} onPress={() => subscribe(p.id)} disabled={saving}>
                  <Text style={styles.btnText}>Select {p.name}</Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={styles.skip} onPress={finish}>
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  progress: { paddingTop: 56, paddingBottom: Spacing.lg, paddingHorizontal: Spacing.lg },
  progressText: { color: '#fff', fontWeight: '600', marginBottom: Spacing.sm },
  progressBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3 },
  progressFill: { height: 6, backgroundColor: '#fff', borderRadius: 3 },
  heading: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  sub: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 4, marginBottom: Spacing.lg },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text, marginTop: Spacing.md, marginBottom: Spacing.sm },
  goalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  goalCard: { width: '31%', borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center', backgroundColor: '#fff' },
  goalIcon: { fontSize: 24 },
  goalLabel: { fontSize: FontSize.xs, color: Colors.text, textAlign: 'center', marginTop: 4 },
  row: { flexDirection: 'row' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: FontSize.md, color: Colors.text },
  btn: { padding: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'center', marginTop: Spacing.lg },
  btnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },
  planCard: { backgroundColor: '#fff', borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  planTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  planPrice: { fontSize: FontSize.lg, fontWeight: '800' },
  planDesc: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 4 },
  planFeatures: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginTop: Spacing.sm },
  feature: { fontSize: FontSize.xs, color: Colors.text },
  empty: { color: Colors.textMuted, fontStyle: 'italic', marginVertical: Spacing.lg, textAlign: 'center' },
  skip: { padding: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  skipText: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: '600' },
});
