import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/auth-context';
import { Colors, Spacing, BorderRadius, FontSize } from '../lib/theme';
import { fitnessApi } from '../lib/api';

export default function MyMembershipScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [member, setMember] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [freezeDays, setFreezeDays] = useState('7');
  const [freezeReason, setFreezeReason] = useState('');

  useEffect(() => {
    if (!token) {
      router.replace('/(auth)/login');
      return;
    }
    loadData();
  }, [token]);

  const loadData = async () => {
    setLoading(true);
    const [m, p] = await Promise.all([
      fitnessApi.members.me(),
      fitnessApi.plans.list({ active: 'true' }),
    ]);
    if (m.data) setMember(m.data);
    if (p.data) setPlans(Array.isArray(p.data) ? p.data : p.data?.items ?? []);
    setLoading(false);
  };

  const activePlan = member?.memberships?.[0];

  const handleFreeze = async () => {
    if (!activePlan) return;
    const days = parseInt(freezeDays) || 0;
    if (days <= 0) return Alert.alert('Invalid', 'Days must be positive');
    Alert.alert('Confirm', `Freeze for ${days} days?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Freeze',
        onPress: async () => {
          const res = await fitnessApi.memberships.freeze(activePlan.id, days, freezeReason || 'User requested');
          if (res.error) return Alert.alert('Error', res.error);
          Alert.alert('Done', 'Membership frozen');
          loadData();
        },
      },
    ]);
  };

  const handleUnfreeze = async () => {
    if (!activePlan) return;
    const res = await fitnessApi.memberships.unfreeze(activePlan.id);
    if (res.error) return Alert.alert('Error', res.error);
    Alert.alert('Done', 'Membership unfrozen');
    loadData();
  };

  const handleSubscribe = async (planId: string) => {
    if (!member?.id) return Alert.alert('Error', 'Member profile not found.');
    Alert.alert('Subscribe', 'Reserve this plan? You can complete payment to activate it.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Subscribe',
        onPress: async () => {
          const res = await fitnessApi.memberships.create({ memberId: member.id, planId });
          if (res.error) return Alert.alert('Error', res.error);
          Alert.alert('Reserved', 'Plan reserved. Complete payment to activate your membership.');
          loadData();
        },
      },
    ]);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>My Membership</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
        {activePlan ? (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.planName}>{activePlan.plan?.name}</Text>
                <Text style={styles.planDesc}>{activePlan.plan?.description}</Text>
              </View>
              <View style={[styles.statusBadge, activePlan.status === 'ACTIVE' ? styles.statusActive : activePlan.status === 'FROZEN' ? styles.statusFrozen : styles.statusOther]}>
                <Text style={styles.statusText}>{activePlan.status}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Start</Text>
              <Text style={styles.detailValue}>{new Date(activePlan.startDate).toLocaleDateString()}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>End</Text>
              <Text style={styles.detailValue}>{new Date(activePlan.endDate).toLocaleDateString()}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>QR Code</Text>
              <Text style={[styles.detailValue, { fontFamily: 'monospace', fontSize: FontSize.xs }]}>{activePlan.qrCode}</Text>
            </View>

            {activePlan.status === 'ACTIVE' && activePlan.plan?.freezeAllowed && (
              <View style={styles.freezeBox}>
                <Text style={styles.freezeTitle}>Freeze Membership</Text>
                <Text style={styles.freezeHelp}>Going on vacation? Pause for Dashain/Tihar?</Text>
                <TextInput
                  style={styles.input}
                  value={freezeDays}
                  onChangeText={setFreezeDays}
                  placeholder="Days"
                  keyboardType="number-pad"
                />
                <TextInput
                  style={styles.input}
                  value={freezeReason}
                  onChangeText={setFreezeReason}
                  placeholder="Reason (optional)"
                />
                <TouchableOpacity style={styles.btn} onPress={handleFreeze}>
                  <Text style={styles.btnText}>Freeze</Text>
                </TouchableOpacity>
              </View>
            )}

            {activePlan.isFrozen && (
              <TouchableOpacity style={[styles.btn, { backgroundColor: '#16a34a', marginTop: Spacing.md }]} onPress={handleUnfreeze}>
                <Text style={styles.btnText}>Unfreeze Now</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.emptyText}>No active membership. Choose a plan below.</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Available Plans</Text>
        {plans.map((p) => (
          <View key={p.id} style={[styles.card, activePlan?.planId === p.id && { borderWidth: 2, borderColor: Colors.primary }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.planName}>{p.name}</Text>
              <Text style={styles.priceText}>NPR {p.priceNpr}</Text>
            </View>
            <Text style={styles.planDesc}>{p.description}</Text>
            <View style={styles.featuresList}>
              <Text style={styles.feature}>📅 {p.durationDays} days</Text>
              {p.includesTrainer && <Text style={styles.feature}>✓ Personal Trainer</Text>}
              {p.includesClasses && <Text style={styles.feature}>✓ Group Classes</Text>}
              {p.includesDietPlan && <Text style={styles.feature}>✓ Diet Plan</Text>}
              {p.freezeAllowed && <Text style={styles.feature}>✓ Can freeze ({p.maxFreezeDays}d)</Text>}
            </View>
            <View style={styles.vatRow}>
              <Text style={styles.vatText}>+{p.vatPercent}% VAT = NPR {p.totalWithVat}</Text>
            </View>
            <TouchableOpacity
              style={[styles.btn, activePlan?.planId === p.id && { backgroundColor: Colors.textMuted }]}
              disabled={activePlan?.planId === p.id}
              onPress={() => handleSubscribe(p.id)}
            >
              <Text style={styles.btnText}>{activePlan?.planId === p.id ? 'Current Plan' : 'Subscribe'}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  card: { backgroundColor: '#fff', padding: Spacing.lg, borderRadius: BorderRadius.lg, marginBottom: Spacing.md },
  planName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, flex: 1 },
  planDesc: { fontSize: FontSize.sm, color: Colors.textMuted, marginVertical: Spacing.xs },
  priceText: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.primary },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs, borderBottomWidth: 1, borderBottomColor: Colors.border },
  detailLabel: { color: Colors.textMuted, fontSize: FontSize.sm },
  detailValue: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '500' },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
  statusActive: { backgroundColor: '#dcfce7' },
  statusFrozen: { backgroundColor: '#dbeafe' },
  statusOther: { backgroundColor: '#f3f4f6' },
  statusText: { fontSize: FontSize.xs, fontWeight: '600' },
  freezeBox: { marginTop: Spacing.lg, padding: Spacing.md, backgroundColor: '#f0f9ff', borderRadius: BorderRadius.md },
  freezeTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  freezeHelp: { fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.sm },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.sm, marginBottom: Spacing.sm },
  btn: { backgroundColor: Colors.primary, padding: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'center', marginTop: Spacing.sm },
  btnText: { color: '#fff', fontWeight: '600', fontSize: FontSize.md },
  emptyText: { color: Colors.textMuted, textAlign: 'center', fontStyle: 'italic' },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginVertical: Spacing.md },
  featuresList: { marginVertical: Spacing.sm },
  feature: { fontSize: FontSize.sm, color: Colors.text, marginVertical: 2 },
  vatRow: { paddingTop: Spacing.sm },
  vatText: { fontSize: FontSize.xs, color: Colors.textMuted },
});
