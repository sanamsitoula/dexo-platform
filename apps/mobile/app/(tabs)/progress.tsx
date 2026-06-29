import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth-context';
import { Colors, Spacing, BorderRadius, FontSize } from '../../lib/theme';
import { fitnessApi } from '../../lib/api';

export default function ProgressScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [foodSummary, setFoodSummary] = useState<any>(null);
  const [badges, setBadges] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

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
    const memberId = memberRes.data.id;
    const [s, a, f, b] = await Promise.all([
      fitnessApi.workoutLogs.stats(memberId),
      fitnessApi.assessments.progress(memberId),
      fitnessApi.foodLogs.summary(memberId),
      fitnessApi.badges.memberBadges(memberId),
    ]);
    if (s.data) setStats(s.data);
    if (a.data) setAssessments(Array.isArray(a.data) ? a.data : []);
    if (f.data) setFoodSummary(f.data);
    if (b.data) setBadges(Array.isArray(b.data) ? b.data : []);
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
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>My Progress</Text>
        <TouchableOpacity onPress={loadData}>
          <Ionicons name="refresh" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        <StatBox label="This Week" value={stats?.thisWeek ?? 0} icon="flame" color="#ef4444" />
        <StatBox label="Total Min" value={stats?.totalMinutes ?? 0} icon="time" color="#3b82f6" />
        <StatBox label="Streak" value={`${stats?.streak ?? 0}d`} icon="trophy" color="#f59e0b" />
        <StatBox label="Calories" value={stats?.totalCalories ?? 0} icon="flash" color="#8b5cf6" />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Body Measurements</Text>
        {assessments.length === 0 ? (
          <Text style={styles.emptyText}>No measurements yet — visit your gym</Text>
        ) : (
          assessments.slice(0, 4).map((a) => (
            <View key={a.id} style={styles.measureRow}>
              <Text style={styles.measureDate}>{new Date(a.assessedAt).toLocaleDateString()}</Text>
              <Text style={styles.measureValue}>{a.weight ?? '—'}kg</Text>
              <Text style={styles.measureValue}>BMI {a.bmi ?? '—'}</Text>
              <Text style={styles.measureValue}>{a.bodyFatPercent ?? '—'}% fat</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's Nutrition</Text>
        {foodSummary ? (
          <>
            <View style={styles.nutritionRow}>
              <Text style={styles.nutritionLabel}>Calories</Text>
              <Text style={styles.nutritionValue}>{foodSummary.calories ?? 0} kcal</Text>
            </View>
            <View style={styles.nutritionRow}>
              <Text style={styles.nutritionLabel}>Protein</Text>
              <Text style={styles.nutritionValue}>{foodSummary.protein?.toFixed(0) ?? 0}g</Text>
            </View>
            <View style={styles.nutritionRow}>
              <Text style={styles.nutritionLabel}>Carbs</Text>
              <Text style={styles.nutritionValue}>{foodSummary.carbs?.toFixed(0) ?? 0}g</Text>
            </View>
            <View style={styles.nutritionRow}>
              <Text style={styles.nutritionLabel}>Fats</Text>
              <Text style={styles.nutritionValue}>{foodSummary.fats?.toFixed(0) ?? 0}g</Text>
            </View>
            <View style={styles.nutritionRow}>
              <Text style={styles.nutritionLabel}>Water</Text>
              <Text style={styles.nutritionValue}>{foodSummary.water ?? 0}ml</Text>
            </View>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/diet-log')}>
              <Text style={styles.actionBtnText}>Log Food</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.emptyText}>No data for today</Text>
        )}
      </View>

      <View style={styles.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.cardTitle}>Badges ({badges.length})</Text>
          <TouchableOpacity onPress={async () => {
            const memberRes = await fitnessApi.members.me();
            if (memberRes.data) {
              await fitnessApi.badges.checkStreak(memberRes.data.id);
              await fitnessApi.badges.checkMilestones(memberRes.data.id);
              loadData();
            }
          }}>
            <Text style={{ color: Colors.primary, fontWeight: '600' }}>Check New</Text>
          </TouchableOpacity>
        </View>
        {badges.length === 0 ? (
          <Text style={styles.emptyText}>No badges yet — keep working out!</Text>
        ) : (
          <View style={styles.badgeGrid}>
            {badges.slice(0, 8).map((b) => (
              <View key={b.id} style={styles.badgeItem}>
                <Text style={styles.badgeIcon}>{b.badge?.icon ?? '🏆'}</Text>
                <Text style={styles.badgeName} numberOfLines={1}>{b.badge?.name}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function StatBox({ label, value, icon, color }: any) {
  return (
    <View style={styles.statBox}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, backgroundColor: '#fff' },
  title: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: Spacing.sm, gap: Spacing.sm },
  statBox: { flex: 1, minWidth: '45%', backgroundColor: '#fff', padding: Spacing.lg, borderRadius: BorderRadius.lg, alignItems: 'center' },
  statValue: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.text, marginTop: Spacing.xs },
  statLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  card: { backgroundColor: '#fff', margin: Spacing.md, padding: Spacing.lg, borderRadius: BorderRadius.lg },
  cardTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  emptyText: { color: Colors.textMuted, fontStyle: 'italic' },
  measureRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs, borderBottomWidth: 1, borderBottomColor: Colors.border },
  measureDate: { flex: 1.2, color: Colors.textMuted, fontSize: FontSize.sm },
  measureValue: { flex: 1, color: Colors.text, fontSize: FontSize.sm, textAlign: 'right', fontWeight: '500' },
  nutritionRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs },
  nutritionLabel: { color: Colors.textMuted, fontSize: FontSize.md },
  nutritionValue: { color: Colors.text, fontSize: FontSize.md, fontWeight: '600' },
  actionBtn: { backgroundColor: Colors.primary, padding: Spacing.md, borderRadius: BorderRadius.md, marginTop: Spacing.md, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: '600' },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
  badgeItem: { width: '23%', alignItems: 'center', padding: Spacing.sm, backgroundColor: '#fef9c3', borderRadius: BorderRadius.md },
  badgeIcon: { fontSize: 28 },
  badgeName: { fontSize: 10, marginTop: 4, textAlign: 'center', color: Colors.text },
});
