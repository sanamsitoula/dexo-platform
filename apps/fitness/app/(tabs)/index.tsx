import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { useAuth } from '@dexo/mobile-core/lib/auth-context';
import { useTenant } from '@dexo/mobile-core/lib/tenant-context';
import { Colors, Spacing, BorderRadius, FontSize, Shadows } from '@dexo/mobile-core/lib/theme';
import { fitnessApi } from '@dexo/mobile-core/lib/api';
import ProgressRing from '@dexo/mobile-core/components/ProgressRing';

const WEEKLY_GOAL = 4; // sessions/week target

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Count consecutive days (ending today or yesterday) that have a workout log. */
function computeStreak(dates: string[]): number {
  const days = new Set(dates.map((d) => new Date(d).toDateString()));
  let streak = 0;
  const cur = new Date();
  // allow today OR yesterday to start the streak
  if (!days.has(cur.toDateString())) cur.setDate(cur.getDate() - 1);
  while (days.has(cur.toDateString())) {
    streak++;
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { tenant } = useTenant();
  const primary = tenant?.primaryColor || Colors.primary;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [member, setMember] = useState<any>(null);
  const [todayPlan, setTodayPlan] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [nextClass, setNextClass] = useState<any>(null);
  const [checkedInToday, setCheckedInToday] = useState(false);

  const load = useCallback(async () => {
    const memberRes = await fitnessApi.members.me().catch(() => ({ data: null as any }));
    const m = memberRes.data;
    setMember(m);

    // First-run → onboarding (guarded so "skip" doesn't loop).
    if (m && user?.id) {
      const onboarded = await SecureStore.getItemAsync(`onboarded_${user.id}`).catch(() => null);
      const incomplete = !m.goals && (m.status === 'PENDING_VERIFICATION' || !m.memberships?.length);
      if (incomplete && !onboarded) {
        router.replace('/onboarding');
        return;
      }
    }

    const memberId = m?.id;
    const [plansRes, logsRes, classRes] = await Promise.all([
      memberId ? fitnessApi.workoutPlans.list({ memberId, active: 'true' }).catch(() => ({ data: [] as any })) : Promise.resolve({ data: [] as any }),
      memberId ? fitnessApi.workoutLogs.list({ memberId }).catch(() => ({ data: [] as any })) : Promise.resolve({ data: [] as any }),
      fitnessApi.classes.list({ upcoming: 'true' }).catch(() => ({ data: [] as any })),
    ]);

    const plans = Array.isArray(plansRes.data) ? plansRes.data : plansRes.data?.items ?? plansRes.data?.data ?? [];
    setTodayPlan(plans[0] || null);

    const logList = Array.isArray(logsRes.data) ? logsRes.data : logsRes.data?.items ?? [];
    setLogs(logList);

    const classes = Array.isArray(classRes.data) ? classRes.data : classRes.data?.items ?? classRes.data?.data ?? [];
    setNextClass(classes[0] || null);

    if (memberId) {
      const today = await fitnessApi.checkin.today().catch(() => ({ data: null as any }));
      const list = Array.isArray(today.data) ? today.data : today.data?.items ?? [];
      setCheckedInToday(list.some((c: any) => c.memberId === memberId));
    }

    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={primary} />
      </View>
    );
  }

  // Derived metrics
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const thisWeek = logs.filter((l) => new Date(l.performedAt || l.createdAt || l.date) >= weekStart).length;
  const streak = computeStreak(logs.map((l) => l.performedAt || l.createdAt || l.date).filter(Boolean));
  const calories = logs
    .filter((l) => new Date(l.performedAt || l.createdAt || l.date) >= weekStart)
    .reduce((s, l) => s + (l.caloriesBurned || l.calories || 0), 0);
  const weekProgress = Math.min(1, thisWeek / WEEKLY_GOAL);

  const membership = member?.memberships?.[0] || null;
  const daysLeft = membership?.endDate
    ? Math.max(0, Math.ceil((new Date(membership.endDate).getTime() - now.getTime()) / 86400000))
    : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: Spacing.xxl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primary} />}
    >
      {/* Greeting */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greetingKicker}>{greeting()},</Text>
          <Text style={styles.greetingName}>{user?.firstName || 'Athlete'} 👋</Text>
          <Text style={styles.greetingSub}>{streak > 0 ? `You’re on a ${streak}-day streak. Keep it alive.` : 'Let’s make today count.'}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={[styles.avatar, { backgroundColor: primary }]}>
          <Text style={styles.avatarText}>{(user?.firstName || 'A').charAt(0).toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      {/* Today's workout — hero */}
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => router.push('/workout-log')}
        style={[styles.hero, { backgroundColor: primary }]}
      >
        <Text style={styles.heroKicker}>TODAY’S WORKOUT</Text>
        <Text style={styles.heroTitle}>{todayPlan?.name || todayPlan?.title || 'Full Body Strength'}</Text>
        <View style={styles.heroMeta}>
          <View style={styles.heroMetaItem}>
            <Ionicons name="time-outline" size={16} color="#fff" />
            <Text style={styles.heroMetaText}>{todayPlan?.durationMin || todayPlan?.estimatedMinutes || 45} min</Text>
          </View>
          <View style={styles.heroMetaItem}>
            <Ionicons name="flame-outline" size={16} color="#fff" />
            <Text style={styles.heroMetaText}>{todayPlan?.difficulty || 'Intermediate'}</Text>
          </View>
          <View style={styles.heroMetaItem}>
            <Ionicons name="barbell-outline" size={16} color="#fff" />
            <Text style={styles.heroMetaText}>{todayPlan?.exercises?.length || todayPlan?.exerciseCount || 6} exercises</Text>
          </View>
        </View>
        <View style={styles.heroBtn}>
          <Text style={[styles.heroBtnText, { color: primary }]}>Start workout</Text>
          <Ionicons name="play" size={18} color={primary} />
        </View>
      </TouchableOpacity>

      {/* Weekly progress */}
      <View style={styles.card}>
        <View style={styles.progressRow}>
          <ProgressRing size={116} strokeWidth={12} progress={weekProgress} color={primary} value={`${thisWeek}/${WEEKLY_GOAL}`} label="this week" />
          <View style={styles.progressStats}>
            <Metric icon="flame" iconColor={Colors.streak} value={`${streak}`} label="day streak" />
            <Metric icon="barbell" iconColor={primary} value={`${logs.length}`} label="total sessions" />
            <Metric icon="bonfire" iconColor={Colors.move} value={`${Math.round(calories)}`} label="kcal this week" />
          </View>
        </View>
      </View>

      {/* Membership mini-card */}
      {membership && (
        <TouchableOpacity activeOpacity={0.9} onPress={() => router.push('/my-membership')} style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
              <View style={[styles.iconChip, { backgroundColor: primary + '15' }]}>
                <Ionicons name="card" size={20} color={primary} />
              </View>
              <View>
                <Text style={styles.cardTitle}>{membership.plan?.name || 'Membership'}</Text>
                <Text style={styles.cardSub}>
                  {daysLeft != null ? `${daysLeft} days remaining` : String(membership.status || '').toLowerCase()}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
          </View>
        </TouchableOpacity>
      )}

      {/* Upcoming class */}
      {nextClass && (
        <TouchableOpacity activeOpacity={0.9} onPress={() => router.push('/classes')} style={styles.card}>
          <Text style={styles.cardLabel}>UPCOMING CLASS</Text>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.cardTitle}>{nextClass.name || nextClass.title}</Text>
              <Text style={styles.cardSub}>
                {nextClass.startTime ? new Date(nextClass.startTime).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : 'Soon'}
                {nextClass.trainer?.name ? ` · ${nextClass.trainer.name}` : ''}
              </Text>
            </View>
            <View style={[styles.iconChip, { backgroundColor: Colors.stand + '20' }]}>
              <Ionicons name="calendar" size={20} color={Colors.stand} />
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/* Trainer message */}
      {member?.trainer && (
        <TouchableOpacity activeOpacity={0.9} onPress={() => router.push('/(tabs)/team')} style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
            <View style={[styles.avatarSm, { backgroundColor: primary }]}>
              <Text style={styles.avatarText}>{(member.trainer.name || 'T').charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{member.trainer.name || 'Your trainer'}</Text>
              <Text style={styles.cardSub} numberOfLines={1}>Tap to message your coach</Text>
            </View>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={primary} />
          </View>
        </TouchableOpacity>
      )}

      {/* Quick actions */}
      <View style={styles.quickRow}>
        <Quick icon="qr-code-outline" label={checkedInToday ? 'Checked in' : 'Check in'} color={checkedInToday ? Colors.success : primary} onPress={() => router.push('/checkin')} />
        <Quick icon="calendar-outline" label="Book class" color={Colors.stand} onPress={() => router.push('/classes')} />
        <Quick icon="nutrition-outline" label="Nutrition" color={Colors.move} onPress={() => router.push('/diet-log')} />
        <Quick icon="stats-chart-outline" label="Progress" color={Colors.streak} onPress={() => router.push('/(tabs)/progress')} />
      </View>
    </ScrollView>
  );
}

function Metric({ icon, iconColor, value, label }: any) {
  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={18} color={iconColor} />
      <View>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
    </View>
  );
}

function Quick({ icon, label, color, onPress }: any) {
  return (
    <TouchableOpacity style={styles.quick} activeOpacity={0.85} onPress={onPress}>
      <View style={[styles.quickIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.md },
  greetingKicker: { fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: '600' },
  greetingName: { fontSize: FontSize.title, color: Colors.text, fontWeight: '800', letterSpacing: -0.5, marginTop: 2 },
  greetingSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  avatarSm: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: FontSize.lg },

  hero: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.hero,
    padding: Spacing.lg,
    ...Shadows.md,
  },
  heroKicker: { color: 'rgba(255,255,255,0.85)', fontSize: FontSize.xs, fontWeight: '800', letterSpacing: 1.5 },
  heroTitle: { color: '#fff', fontSize: FontSize.xxl, fontWeight: '800', marginTop: 6, letterSpacing: -0.5 },
  heroMeta: { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.md },
  heroMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroMetaText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '600' },
  heroBtn: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  heroBtnText: { fontWeight: '800', fontSize: FontSize.md },

  card: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.xl2,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  cardLabel: { fontSize: FontSize.xs, color: Colors.textLight, fontWeight: '800', letterSpacing: 1, marginBottom: Spacing.sm },
  cardTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  cardSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconChip: { width: 42, height: 42, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },

  progressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  progressStats: { flex: 1, gap: Spacing.md },
  metric: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  metricValue: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  metricLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },

  quickRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, marginTop: Spacing.lg, gap: Spacing.sm },
  quick: { flex: 1, alignItems: 'center' },
  quickIcon: { width: 58, height: 58, borderRadius: BorderRadius.xl, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: FontSize.xs, color: Colors.text, marginTop: 6, fontWeight: '600' },
});
