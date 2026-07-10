import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth-context';
import { useTenant } from '../../lib/tenant-context';
import { Colors, Spacing, BorderRadius, FontSize, Shadows } from '../../lib/theme';
import { fitnessApi } from '../../lib/api';
import ProgressRing from '../../components/ProgressRing';

const WEEKLY_GOAL = 4;

export default function ProgressScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { tenant } = useTenant();
  const primary = tenant?.primaryColor || Colors.primary;

  const [stats, setStats] = useState<any>(null);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const memberRes = await fitnessApi.members.me();
    if (!memberRes.data) { setLoading(false); setRefreshing(false); return; }
    const memberId = memberRes.data.id;
    const [s, a, b] = await Promise.all([
      fitnessApi.workoutLogs.stats(memberId).catch(() => ({ data: null as any })),
      fitnessApi.assessments.progress(memberId).catch(() => ({ data: [] as any })),
      fitnessApi.badges.memberBadges(memberId).catch(() => ({ data: [] as any })),
    ]);
    if (s.data) setStats(s.data);
    setAssessments(Array.isArray(a.data) ? a.data : a.data?.items ?? []);
    setBadges(Array.isArray(b.data) ? b.data : b.data?.items ?? []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (!token) { router.replace('/(auth)/login'); return; }
    load();
  }, [token, load]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={primary} /></View>;

  const thisWeek = stats?.thisWeek ?? 0;
  const weekProgress = Math.min(1, thisWeek / WEEKLY_GOAL);
  // Weight timeline (oldest → newest)
  const sorted = [...assessments].sort((x, y) => new Date(x.assessedAt).getTime() - new Date(y.assessedAt).getTime());
  const weights = sorted.map((a) => Number(a.weight)).filter((n) => !isNaN(n));
  const latest = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];
  const weightDelta = latest && prev && latest.weight && prev.weight ? Number(latest.weight) - Number(prev.weight) : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: Spacing.xxl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={primary} />}
    >
      <View style={styles.headerWrap}>
        <Text style={styles.h1}>Your progress</Text>
        <Text style={styles.sub}>Everything you’ve earned so far.</Text>
      </View>

      {/* Weekly ring + tiles */}
      <View style={styles.card}>
        <View style={styles.ringRow}>
          <ProgressRing size={124} strokeWidth={13} progress={weekProgress} color={primary} value={`${thisWeek}/${WEEKLY_GOAL}`} label="this week" />
          <View style={{ flex: 1, gap: Spacing.md }}>
            <Tile icon="flame" color={Colors.streak} value={`${stats?.streak ?? 0}`} label="day streak" />
            <Tile icon="time" color={primary} value={`${stats?.totalMinutes ?? 0}`} label="total minutes" />
            <Tile icon="bonfire" color={Colors.move} value={`${stats?.totalCalories ?? 0}`} label="calories burned" />
          </View>
        </View>
      </View>

      {/* Body composition */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Body composition</Text>
          <TouchableOpacity onPress={() => router.push('/diet-log')}><Text style={[styles.link, { color: primary }]}>Log</Text></TouchableOpacity>
        </View>
        {latest ? (
          <View style={styles.compRow}>
            <Comp value={`${latest.weight ?? '—'}`} unit="kg" label="Weight" delta={weightDelta} />
            <Comp value={`${latest.bmi ?? '—'}`} unit="" label="BMI" />
            <Comp value={`${latest.bodyFatPercent ?? '—'}`} unit="%" label="Body fat" />
            <Comp value={`${latest.muscleMass ?? '—'}`} unit="kg" label="Muscle" />
          </View>
        ) : (
          <Text style={styles.empty}>No measurements yet — your trainer will record these.</Text>
        )}
      </View>

      {/* Weight timeline */}
      {weights.length >= 2 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Weight trend</Text>
          <Sparkline data={weights} color={primary} />
          <View style={styles.rowBetween}>
            <Text style={styles.axis}>{new Date(sorted[0].assessedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</Text>
            <Text style={styles.axis}>{new Date(latest.assessedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</Text>
          </View>
        </View>
      )}

      {/* Achievements */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Achievements</Text>
        {badges.length === 0 ? (
          <View style={styles.emptyBadges}>
            <Text style={{ fontSize: 40 }}>🏅</Text>
            <Text style={styles.empty}>Your first badge is one workout away.</Text>
          </View>
        ) : (
          <View style={styles.badgeGrid}>
            {badges.slice(0, 9).map((b) => (
              <View key={b.id} style={styles.badge}>
                <View style={[styles.badgeCircle, { backgroundColor: primary + '12' }]}>
                  <Text style={{ fontSize: 26 }}>{b.badge?.icon ?? '🏆'}</Text>
                </View>
                <Text style={styles.badgeName} numberOfLines={1}>{b.badge?.name}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function Tile({ icon, color, value, label }: any) {
  return (
    <View style={styles.tile}>
      <Ionicons name={icon} size={20} color={color} />
      <View>
        <Text style={styles.tileValue}>{value}</Text>
        <Text style={styles.tileLabel}>{label}</Text>
      </View>
    </View>
  );
}

function Comp({ value, unit, label, delta }: any) {
  return (
    <View style={styles.comp}>
      <Text style={styles.compValue}>{value}<Text style={styles.compUnit}>{unit}</Text></Text>
      <Text style={styles.compLabel}>{label}</Text>
      {delta != null && delta !== 0 && (
        <Text style={[styles.compDelta, { color: delta < 0 ? Colors.success : Colors.warning }]}>
          {delta < 0 ? '▼' : '▲'} {Math.abs(delta).toFixed(1)}
        </Text>
      )}
    </View>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  return (
    <View style={styles.spark}>
      {data.map((v, i) => {
        const h = 12 + ((v - min) / range) * 68;
        return <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
          <View style={{ width: '58%', height: h, backgroundColor: color, borderRadius: 4, opacity: 0.35 + (i / data.length) * 0.65 }} />
        </View>;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerWrap: { paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.sm },
  h1: { fontSize: FontSize.title, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  sub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4 },

  card: { backgroundColor: Colors.surface, marginHorizontal: Spacing.lg, marginTop: Spacing.md, borderRadius: BorderRadius.xl2, padding: Spacing.lg, ...Shadows.sm },
  cardTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm },
  link: { fontWeight: '700', fontSize: FontSize.sm },

  ringRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  tile: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  tileValue: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  tileLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },

  compRow: { flexDirection: 'row', marginTop: Spacing.md },
  comp: { flex: 1, alignItems: 'center' },
  compValue: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  compUnit: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600' },
  compLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  compDelta: { fontSize: FontSize.xs, fontWeight: '700', marginTop: 2 },

  spark: { flexDirection: 'row', alignItems: 'flex-end', height: 90, gap: 3, marginTop: Spacing.md },
  axis: { fontSize: FontSize.xs, color: Colors.textLight },

  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: Spacing.md },
  badge: { width: '33.33%', alignItems: 'center', marginBottom: Spacing.md },
  badgeCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  badgeName: { fontSize: FontSize.xs, color: Colors.text, marginTop: 6, fontWeight: '600' },
  emptyBadges: { alignItems: 'center', paddingVertical: Spacing.lg },
  empty: { color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center', marginTop: 6 },
});
