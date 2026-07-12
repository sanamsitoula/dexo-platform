import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@dexo/mobile-core/lib/auth-context';
import { Colors, Spacing, BorderRadius, FontSize } from '@dexo/mobile-core/lib/theme';
import { fitnessApi } from '@dexo/mobile-core/lib/api';

export default function WorkoutsScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [memberId, setMemberId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      router.replace('/(auth)/login');
      return;
    }
    loadData();
  }, [token]);

  const loadData = async () => {
    setRefreshing(true);
    const memberRes = await fitnessApi.members.me();
    if (memberRes.error || !memberRes.data) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    setMemberId(memberRes.data.id);
    const [p, l] = await Promise.all([
      fitnessApi.workoutPlans.list({ memberId: memberRes.data.id }),
      fitnessApi.workoutLogs.list({ memberId: memberRes.data.id }),
    ]);
    if (p.data) setPlans(Array.isArray(p.data) ? p.data : p.data?.items ?? []);
    if (l.data) setLogs(Array.isArray(l.data) ? l.data : l.data?.items ?? []);
    setLoading(false);
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Workouts</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/workout-log')}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Log</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={plans}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="barbell-outline" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No workout plans yet</Text>
            <Text style={styles.emptySubtext}>Your trainer will assign one after assessment</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <View style={[styles.badge, item.status === 'ACTIVE' ? styles.badgeActive : styles.badgeDraft]}>
                <Text style={styles.badgeText}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.cardSubtitle}>{item.goalType} • {item.fitnessLevel}</Text>
            <View style={styles.cardMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={16} color={Colors.textMuted} />
                <Text style={styles.metaText}>{item.durationWeeks} weeks</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="repeat-outline" size={16} color={Colors.textMuted} />
                <Text style={styles.metaText}>{item.daysPerWeek} days/week</Text>
              </View>
            </View>
            {item.workoutDays && (
              <View style={styles.daysList}>
                {item.workoutDays.slice(0, 4).map((day: any) => (
                  <View key={day.id} style={styles.dayChip}>
                    <Text style={styles.dayChipText}>{day.dayName}</Text>
                    <Text style={styles.dayChipCount}>{day.exercises?.length ?? 0} ex</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
        ListFooterComponent={
          logs.length > 0 ? (
            <View style={{ marginTop: Spacing.lg }}>
              <Text style={styles.sectionTitle}>Recent Logs</Text>
              {logs.slice(0, 5).map((log) => (
                <View key={log.id} style={styles.logCard}>
                  <View>
                    <Text style={styles.logDate}>{new Date(log.workoutDate).toLocaleDateString()}</Text>
                    <Text style={styles.logMeta}>
                      {log.duration}min • {log.caloriesBurned ?? 0} kcal
                    </Text>
                  </View>
                  <View style={[styles.badge, log.status === 'COMPLETED' ? styles.badgeActive : styles.badgeDraft]}>
                    <Text style={styles.badgeText}>{log.status}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing.lg, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md },
  addBtnText: { color: '#fff', marginLeft: 4, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyText: { fontSize: FontSize.lg, color: Colors.textMuted, marginTop: Spacing.md },
  emptySubtext: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: Spacing.xs, textAlign: 'center', paddingHorizontal: Spacing.lg },
  card: { backgroundColor: '#fff', margin: Spacing.md, padding: Spacing.lg, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.xs },
  cardTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, flex: 1 },
  cardSubtitle: { fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.md },
  cardMeta: { flexDirection: 'row', gap: Spacing.lg, marginBottom: Spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: FontSize.sm, color: Colors.textMuted, marginLeft: 4 },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm },
  badgeActive: { backgroundColor: '#dcfce7' },
  badgeDraft: { backgroundColor: '#fef3c7' },
  badgeText: { fontSize: FontSize.xs, fontWeight: '600' },
  daysList: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  dayChip: { backgroundColor: Colors.background, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm, marginRight: 4, marginBottom: 4 },
  dayChipText: { fontSize: FontSize.xs, color: Colors.text, fontWeight: '600' },
  dayChipCount: { fontSize: 10, color: Colors.textMuted },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  logCard: { backgroundColor: '#fff', marginHorizontal: Spacing.md, marginBottom: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logDate: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  logMeta: { fontSize: FontSize.sm, color: Colors.textMuted },
});
