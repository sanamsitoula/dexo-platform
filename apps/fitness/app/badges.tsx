import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@dexo/mobile-core/lib/auth-context';
import { Colors, Spacing, BorderRadius, FontSize } from '@dexo/mobile-core/lib/theme';
import { fitnessApi } from '@dexo/mobile-core/lib/api';

export default function BadgesScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [allBadges, setAllBadges] = useState<any[]>([]);
  const [myBadges, setMyBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      router.replace('/(auth)/login');
      return;
    }
    loadData();
  }, [token]);

  const loadData = async () => {
    setLoading(true);
    const memberRes = await fitnessApi.members.me();
    if (!memberRes.data) {
      setLoading(false);
      return;
    }
    const [all, mine] = await Promise.all([
      fitnessApi.badges.list({ active: 'true' }),
      fitnessApi.badges.memberBadges(memberRes.data.id),
    ]);
    if (all.data) setAllBadges(Array.isArray(all.data) ? all.data : all.data?.items ?? []);
    if (mine.data) setMyBadges(Array.isArray(mine.data) ? mine.data : []);
    setLoading(false);
  };

  const checkBadges = async () => {
    const memberRes = await fitnessApi.members.me();
    if (!memberRes.data) return;
    const [s, m] = await Promise.all([
      fitnessApi.badges.checkStreak(memberRes.data.id),
      fitnessApi.badges.checkMilestones(memberRes.data.id),
    ]);
    const total = (s.data?.awardedBadges?.length ?? 0) + (m.data?.awardedBadges?.length ?? 0);
    if (total > 0) {
      Alert.alert('New Badges!', `You earned ${total} new badge${total > 1 ? 's' : ''}!`);
    } else {
      Alert.alert('No new badges', 'Keep working out to earn more!');
    }
    loadData();
  };

  const earnedIds = new Set(myBadges.map((b) => b.badgeId));

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
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Badges</Text>
        <TouchableOpacity onPress={checkBadges}>
          <Ionicons name="refresh" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <Text style={styles.statsText}>
          {myBadges.length} of {allBadges.length} earned
        </Text>
      </View>

      <FlatList
        data={allBadges}
        keyExtractor={(b) => b.id}
        numColumns={3}
        contentContainerStyle={{ padding: Spacing.md }}
        renderItem={({ item }) => {
          const earned = earnedIds.has(item.id);
          return (
            <View style={[styles.badgeCard, earned ? styles.badgeEarned : styles.badgeLocked]}>
              <Text style={styles.badgeIcon}>{item.icon ?? '🏆'}</Text>
              <Text style={styles.badgeName} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.badgeCategory}>{item.category}</Text>
              {earned && <Ionicons name="checkmark-circle" size={20} color="#16a34a" style={{ position: 'absolute', top: 4, right: 4 }} />}
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No badges configured</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  statsRow: { padding: Spacing.md, backgroundColor: '#fff' },
  statsText: { fontSize: FontSize.md, color: Colors.textMuted, textAlign: 'center' },
  badgeCard: { flex: 1, margin: 4, padding: Spacing.md, borderRadius: BorderRadius.lg, alignItems: 'center', minHeight: 110 },
  badgeEarned: { backgroundColor: '#fef9c3', borderWidth: 2, borderColor: '#facc15' },
  badgeLocked: { backgroundColor: '#f3f4f6', opacity: 0.6 },
  badgeIcon: { fontSize: 32, marginBottom: 4 },
  badgeName: { fontSize: FontSize.xs, fontWeight: '600', textAlign: 'center', color: Colors.text },
  badgeCategory: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  empty: { textAlign: 'center', color: Colors.textMuted, padding: Spacing.xl },
});
