import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, Clipboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@dexo/mobile-core/lib/auth-context';
import { Colors, Spacing, BorderRadius, FontSize } from '@dexo/mobile-core/lib/theme';
import { fitnessApi } from '@dexo/mobile-core/lib/api';

export default function ReferralsScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
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
    const [s, list] = await Promise.all([
      fitnessApi.referrals.stats(memberRes.data.id),
      fitnessApi.referrals.list({ referrerId: memberRes.data.id }),
    ]);
    if (s.data) setStats(s.data);
    if (list.data) {
      const arr = Array.isArray(list.data) ? list.data : list.data?.items ?? [];
      setReferrals(arr);
    }
    setLoading(false);
  };

  const generateCode = async () => {
    const memberRes = await fitnessApi.members.me();
    if (!memberRes.data) return;
    const res = await fitnessApi.referrals.create({ referrerId: memberRes.data.id });
    if (res.error) return Alert.alert('Error', res.error);
    loadData();
  };

  const myCode = referrals[0]?.referralCode;

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
        <Text style={styles.title}>Refer Friends</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
        <View style={styles.heroCard}>
          <Ionicons name="gift" size={48} color="#fff" />
          <Text style={styles.heroTitle}>Earn NPR {stats?.totalReward ?? 0}</Text>
          <Text style={styles.heroSubtitle}>by referring friends to your gym</Text>
        </View>

        <View style={styles.statsRow}>
          <StatBox label="Invites" value={stats?.totalInvites ?? 0} />
          <StatBox label="Completed" value={stats?.completed ?? 0} />
          <StatBox label="Pending" value={stats?.pending ?? 0} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Referral Code</Text>
          {myCode ? (
            <>
              <View style={styles.codeBox}>
                <Text style={styles.codeText}>{myCode}</Text>
              </View>
              <TouchableOpacity
                style={styles.btn}
                onPress={() => { Clipboard.setString(myCode); Alert.alert('Copied!', 'Referral code copied to clipboard'); }}
              >
                <Ionicons name="copy" size={20} color="#fff" />
                <Text style={styles.btnText}>Copy Code</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.btn} onPress={generateCode}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.btnText}>Generate My Code</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.helpText}>Share with friends. They get NPR 500 off, you get NPR 500 on next renewal.</Text>
        </View>

        {referrals.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>My Referrals</Text>
            {referrals.map((r) => (
              <View key={r.id} style={styles.refRow}>
                <View>
                  <Text style={styles.refCode}>{r.referralCode}</Text>
                  <Text style={styles.refDate}>{new Date(r.createdAt).toLocaleDateString()}</Text>
                </View>
                <View style={[styles.statusBadge, r.status === 'COMPLETED' ? styles.statusCompleted : styles.statusPending]}>
                  <Text style={styles.statusText}>{r.status}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function StatBox({ label, value }: any) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  heroCard: { backgroundColor: Colors.primary, padding: Spacing.xl, borderRadius: BorderRadius.lg, alignItems: 'center', marginBottom: Spacing.lg },
  heroTitle: { color: '#fff', fontSize: FontSize.xxl, fontWeight: '700', marginTop: Spacing.sm },
  heroSubtitle: { color: '#fff', fontSize: FontSize.md, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  statBox: { flex: 1, backgroundColor: '#fff', padding: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'center' },
  statValue: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  statLabel: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  card: { backgroundColor: '#fff', padding: Spacing.lg, borderRadius: BorderRadius.lg, marginBottom: Spacing.md },
  cardTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  codeBox: { backgroundColor: '#f3f4f6', padding: Spacing.lg, borderRadius: BorderRadius.md, alignItems: 'center', marginBottom: Spacing.md },
  codeText: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.primary, letterSpacing: 2 },
  btn: { backgroundColor: Colors.primary, padding: Spacing.md, borderRadius: BorderRadius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: FontSize.md },
  helpText: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.md },
  refRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  refCode: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text, fontFamily: 'monospace' },
  refDate: { fontSize: FontSize.sm, color: Colors.textMuted },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm },
  statusCompleted: { backgroundColor: '#dcfce7' },
  statusPending: { backgroundColor: '#fef3c7' },
  statusText: { fontSize: FontSize.xs, fontWeight: '600' },
});
