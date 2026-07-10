import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth-context';
import { useTenant } from '../../lib/tenant-context';
import { Colors, Spacing, BorderRadius, FontSize, Shadows } from '../../lib/theme';
import { fitnessApi } from '../../lib/api';

const GOAL_LABELS: Record<string, string> = {
  WEIGHT_LOSS: 'Lose weight', MUSCLE_GAIN: 'Build muscle', ENDURANCE: 'Endurance',
  STRENGTH: 'Get stronger', FLEXIBILITY: 'Flexibility', GENERAL_FITNESS: 'Stay fit',
};

function fitnessLevel(sessions: number) {
  if (sessions >= 100) return { label: 'Elite', color: '#7C3AED' };
  if (sessions >= 40) return { label: 'Advanced', color: '#2563EB' };
  if (sessions >= 15) return { label: 'Intermediate', color: '#16A34A' };
  return { label: 'Beginner', color: '#F59E0B' };
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { tenant, clearTenant } = useTenant();
  const primary = tenant?.primaryColor || Colors.primary;

  const [member, setMember] = useState<any>(null);
  const [sessions, setSessions] = useState(0);
  const [badges, setBadges] = useState(0);
  const [lang, setLang] = useState<'EN' | 'NE'>('EN');

  useEffect(() => {
    (async () => {
      const m = await fitnessApi.members.me().catch(() => ({ data: null as any }));
      if (m.data) {
        setMember(m.data);
        const st = await fitnessApi.workoutLogs.stats(m.data.id).catch(() => ({ data: null as any }));
        setSessions(st.data?.totalWorkouts ?? st.data?.total ?? 0);
        const b = await fitnessApi.badges.memberBadges(m.data.id).catch(() => ({ data: [] as any }));
        setBadges((Array.isArray(b.data) ? b.data : b.data?.items ?? []).length);
      }
    })();
  }, []);

  const goals = String(member?.goals || '').split(',').filter(Boolean);
  const level = fitnessLevel(sessions);
  const membership = member?.memberships?.[0];

  function confirmLogout() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => { await logout(); router.replace('/(auth)/login'); } },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: primary }]}>
        <View style={styles.avatar}>
          <Text style={[styles.avatarText, { color: primary }]}>{(user?.firstName || 'A').charAt(0)}{(user?.lastName || '').charAt(0)}</Text>
        </View>
        <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.levelBadge}>
          <Ionicons name="flash" size={13} color="#fff" />
          <Text style={styles.levelText}>{level.label} · {tenant?.name}</Text>
        </View>
      </View>

      {/* Stats strip */}
      <View style={styles.statsCard}>
        <Stat value={`${sessions}`} label="Sessions" />
        <Divider />
        <Stat value={`${badges}`} label="Badges" />
        <Divider />
        <Stat value={membership ? 'Active' : '—'} label="Membership" />
      </View>

      {/* Goals */}
      <Section title="Your goals" action="Edit" onAction={() => router.push('/onboarding')}>
        {goals.length ? (
          <View style={styles.chips}>
            {goals.map((g) => <View key={g} style={[styles.chip, { backgroundColor: primary + '12' }]}><Text style={[styles.chipText, { color: primary }]}>{GOAL_LABELS[g] || g}</Text></View>)}
          </View>
        ) : <Text style={styles.muted}>No goals set yet.</Text>}
      </Section>

      {/* Quick links */}
      <View style={styles.menu}>
        <Row icon="card-outline" label="Membership & QR" color={primary} onPress={() => router.push('/my-membership')} />
        <Row icon="stats-chart-outline" label="Progress" color={Colors.streak} onPress={() => router.push('/(tabs)/progress')} />
        <Row icon="gift-outline" label="Refer a friend" color={Colors.success} onPress={() => router.push('/referrals')} />
        <Row icon="notifications-outline" label="Notifications" color={Colors.stand} onPress={() => router.push('/(tabs)/notifications')} last />
      </View>

      {/* Preferences */}
      <Section title="Preferences">
        <View style={styles.prefRow}>
          <Text style={styles.prefLabel}>Language</Text>
          <View style={styles.segment}>
            {(['EN', 'NE'] as const).map((l) => (
              <TouchableOpacity key={l} onPress={() => setLang(l)} style={[styles.segItem, lang === l && { backgroundColor: primary }]}>
                <Text style={[styles.segText, lang === l && { color: '#fff' }]}>{l === 'EN' ? 'English' : 'नेपाली'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <Row icon="business-outline" label="Switch business" sublabel={tenant?.name} onPress={() => { clearTenant(); router.replace('/tenant-select'); }} last />
      </Section>

      <TouchableOpacity style={styles.logout} onPress={confirmLogout}>
        <Ionicons name="log-out-outline" size={20} color={Colors.error} />
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>
      <Text style={styles.version}>Dexo Fitness · v1.0.0</Text>
    </ScrollView>
  );
}

function Stat({ value, label }: any) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}
function Divider() { return <View style={styles.vdiv} />; }

function Section({ title, action, onAction, children }: any) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {action && <TouchableOpacity onPress={onAction}><Text style={styles.sectionAction}>{action}</Text></TouchableOpacity>}
      </View>
      {children}
    </View>
  );
}

function Row({ icon, label, sublabel, color, onPress, last }: any) {
  return (
    <TouchableOpacity style={[styles.row, !last && styles.rowBorder]} onPress={onPress}>
      <View style={[styles.rowIcon, { backgroundColor: (color || Colors.textSecondary) + '15' }]}>
        <Ionicons name={icon} size={18} color={color || Colors.textSecondary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sublabel && <Text style={styles.rowSub}>{sublabel}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { alignItems: 'center', paddingTop: 64, paddingBottom: Spacing.xl, borderBottomLeftRadius: BorderRadius.hero, borderBottomRightRadius: BorderRadius.hero },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...Shadows.md },
  avatarText: { fontSize: FontSize.title, fontWeight: '800' },
  name: { color: '#fff', fontSize: FontSize.xxl, fontWeight: '800', marginTop: Spacing.md },
  email: { color: 'rgba(255,255,255,0.85)', fontSize: FontSize.sm, marginTop: 2 },
  levelBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: Spacing.md, paddingVertical: 5, borderRadius: BorderRadius.full, marginTop: Spacing.md },
  levelText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '700' },

  statsCard: { flexDirection: 'row', backgroundColor: Colors.surface, marginHorizontal: Spacing.lg, marginTop: -Spacing.lg, borderRadius: BorderRadius.xl2, padding: Spacing.lg, ...Shadows.md },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  vdiv: { width: 1, backgroundColor: Colors.divider },

  section: { backgroundColor: Colors.surface, marginHorizontal: Spacing.lg, marginTop: Spacing.md, borderRadius: BorderRadius.xl2, padding: Spacing.lg, ...Shadows.sm },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  sectionAction: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full },
  chipText: { fontSize: FontSize.sm, fontWeight: '700' },
  muted: { color: Colors.textSecondary, fontSize: FontSize.sm },

  menu: { backgroundColor: Colors.surface, marginHorizontal: Spacing.lg, marginTop: Spacing.md, borderRadius: BorderRadius.xl2, ...Shadows.sm, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.divider },
  rowIcon: { width: 38, height: 38, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: FontSize.md, color: Colors.text, fontWeight: '600' },
  rowSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },

  prefRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  prefLabel: { fontSize: FontSize.md, color: Colors.text, fontWeight: '600' },
  segment: { flexDirection: 'row', backgroundColor: Colors.surfaceAlt, borderRadius: BorderRadius.full, padding: 3 },
  segItem: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full },
  segText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary },

  logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.surface, marginHorizontal: Spacing.lg, marginTop: Spacing.lg, padding: Spacing.md, borderRadius: BorderRadius.xl2, ...Shadows.sm },
  logoutText: { color: Colors.error, fontSize: FontSize.md, fontWeight: '700' },
  version: { textAlign: 'center', fontSize: FontSize.xs, color: Colors.textLight, marginTop: Spacing.lg },
});
