import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@dexo/mobile-core/lib/auth-context';
import { useTenant } from '@dexo/mobile-core/lib/tenant-context';
import { Colors, Spacing, BorderRadius, FontSize, Shadows } from '@dexo/mobile-core/lib/theme';
import { fitnessApi } from '@dexo/mobile-core/lib/api';
import QRCode from '@dexo/mobile-core/components/QRCode';

export default function MyMembershipScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  const { tenant } = useTenant();
  const primary = tenant?.primaryColor || Colors.primary;

  const [member, setMember] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFreeze, setShowFreeze] = useState(false);
  const [freezeDays, setFreezeDays] = useState('7');
  const [freezeReason, setFreezeReason] = useState('');
  const [showPlans, setShowPlans] = useState(false);

  const load = useCallback(async () => {
    const [m, p] = await Promise.all([
      fitnessApi.members.me(),
      fitnessApi.plans.list({ active: 'true' }),
    ]);
    if (m.data) setMember(m.data);
    if (p.data) setPlans(Array.isArray(p.data) ? p.data : p.data?.items ?? p.data?.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!token) { router.replace('/(auth)/login'); return; }
    load();
  }, [token, load]);

  const active = member?.memberships?.[0];
  const now = new Date();
  const totalDays = active?.plan?.durationDays || 30;
  const daysLeft = active?.endDate ? Math.max(0, Math.ceil((new Date(active.endDate).getTime() - now.getTime()) / 86400000)) : 0;
  const pct = Math.max(0, Math.min(1, daysLeft / totalDays));
  const status = String(active?.status || '').toUpperCase();

  async function handleRenew() {
    if (!active) return;
    Alert.alert('Renew membership', `Renew ${active.plan?.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Renew', onPress: async () => {
        const res = await fitnessApi.memberships.renew(active.id);
        if (res.error) return Alert.alert('Error', res.error);
        Alert.alert('Renewed', 'Your membership has been renewed.');
        load();
      } },
    ]);
  }

  async function handleFreeze() {
    if (!active) return;
    const days = parseInt(freezeDays) || 0;
    if (days <= 0) return Alert.alert('Invalid', 'Days must be positive');
    const res = await fitnessApi.memberships.freeze(active.id, days, freezeReason || 'User requested');
    if (res.error) return Alert.alert('Error', res.error);
    setShowFreeze(false);
    load();
  }

  async function handleUnfreeze() {
    if (!active) return;
    const res = await fitnessApi.memberships.unfreeze(active.id);
    if (res.error) return Alert.alert('Error', res.error);
    load();
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={primary} /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={26} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Membership</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: Spacing.xxl }}>
        {active ? (
          <>
            {/* Wallet card */}
            <View style={[styles.wallet, { backgroundColor: primary }]}>
              <View style={styles.walletTop}>
                <Text style={styles.walletGym}>{tenant?.name || 'Dexo Fitness'}</Text>
                <View style={[styles.badge, { backgroundColor: status === 'ACTIVE' ? '#fff' : 'rgba(255,255,255,0.25)' }]}>
                  <Text style={[styles.badgeText, { color: status === 'ACTIVE' ? primary : '#fff' }]}>{status || 'PENDING'}</Text>
                </View>
              </View>
              <Text style={styles.walletName}>{user?.firstName} {user?.lastName}</Text>
              <Text style={styles.walletPlan}>{active.plan?.name}</Text>

              <View style={styles.walletQr}>
                <QRCode value={active.qrCode || active.id} size={150} />
              </View>

              <View style={styles.walletFooter}>
                <View>
                  <Text style={styles.walletFootLabel}>DAYS LEFT</Text>
                  <Text style={styles.walletFootValue}>{daysLeft}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.walletFootLabel}>VALID UNTIL</Text>
                  <Text style={styles.walletFootValue}>{active.endDate ? new Date(active.endDate).toLocaleDateString() : '—'}</Text>
                </View>
              </View>
              <View style={styles.walletTrack}>
                <View style={[styles.walletFill, { width: `${pct * 100}%` }]} />
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actionRow}>
              <Action icon="refresh" label="Renew" color={primary} onPress={handleRenew} />
              {active.isFrozen ? (
                <Action icon="play" label="Unfreeze" color={Colors.success} onPress={handleUnfreeze} />
              ) : (
                <Action icon="pause" label="Freeze" color={Colors.stand} onPress={() => setShowFreeze((s) => !s)} />
              )}
              <Action icon="gift-outline" label="Refer" color={Colors.streak} onPress={() => router.push('/referrals')} />
            </View>

            {showFreeze && !active.isFrozen && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Freeze membership</Text>
                <Text style={styles.cardSub}>Travelling, or pausing for Dashain/Tihar? We’ll add the days back.</Text>
                <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md }}>
                  <TextInput style={[styles.input, { width: 90 }]} value={freezeDays} onChangeText={setFreezeDays} keyboardType="number-pad" placeholder="Days" placeholderTextColor={Colors.textLight} />
                  <TextInput style={[styles.input, { flex: 1 }]} value={freezeReason} onChangeText={setFreezeReason} placeholder="Reason (optional)" placeholderTextColor={Colors.textLight} />
                </View>
                <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: primary, marginTop: Spacing.md }]} onPress={handleFreeze}>
                  <Text style={styles.primaryBtnText}>Confirm freeze</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Payment summary */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>LAST PAYMENT</Text>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.cardTitle}>NPR {active.amountPaid ?? active.plan?.totalWithVat ?? '—'}</Text>
                  <Text style={styles.cardSub}>{active.paymentMethod || 'Pending'} · {active.startDate ? new Date(active.startDate).toLocaleDateString() : ''}</Text>
                </View>
                <View style={[styles.iconChip, { backgroundColor: primary + '15' }]}>
                  <Ionicons name="receipt-outline" size={20} color={primary} />
                </View>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="card-outline" size={52} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>No active membership</Text>
            <Text style={styles.emptyMsg}>Pick a plan to unlock workouts, classes and your trainer.</Text>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: primary, marginTop: Spacing.lg }]} onPress={() => router.push('/onboarding')}>
              <Text style={styles.primaryBtnText}>Choose a plan</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Plans (expandable) */}
        <TouchableOpacity style={styles.expandRow} onPress={() => setShowPlans((s) => !s)}>
          <Text style={styles.sectionTitle}>{active ? 'Change plan' : 'Available plans'}</Text>
          <Ionicons name={showPlans ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
        {showPlans && plans.map((p) => (
          <View key={p.id} style={[styles.card, active?.planId === p.id && { borderWidth: 2, borderColor: primary }]}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>{p.name}</Text>
              <Text style={[styles.price, { color: primary }]}>NPR {p.totalWithVat ?? p.priceNpr}</Text>
            </View>
            {!!p.description && <Text style={styles.cardSub}>{p.description}</Text>}
            <View style={styles.features}>
              <Text style={styles.feature}>📅 {p.durationDays}d</Text>
              {p.includesTrainer && <Text style={styles.feature}>✓ Trainer</Text>}
              {p.includesClasses && <Text style={styles.feature}>✓ Classes</Text>}
            </View>
            <TouchableOpacity
              disabled={active?.planId === p.id}
              onPress={() => router.push('/onboarding')}
              style={[styles.outlineBtn, { borderColor: primary }, active?.planId === p.id && { opacity: 0.4 }]}
            >
              <Text style={[styles.outlineBtnText, { color: primary }]}>{active?.planId === p.id ? 'Current plan' : 'Choose'}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function Action({ icon, label, color, onPress }: any) {
  return (
    <TouchableOpacity style={styles.action} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.actionIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.md },
  title: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },

  wallet: { borderRadius: BorderRadius.hero, padding: Spacing.lg, ...Shadows.lg },
  walletTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  walletGym: { color: '#fff', fontSize: FontSize.md, fontWeight: '800' },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.full },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  walletName: { color: '#fff', fontSize: FontSize.xl, fontWeight: '800', marginTop: Spacing.md },
  walletPlan: { color: 'rgba(255,255,255,0.85)', fontSize: FontSize.sm, marginTop: 2 },
  walletQr: { alignSelf: 'center', marginVertical: Spacing.lg },
  walletFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  walletFootLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  walletFootValue: { color: '#fff', fontSize: FontSize.md, fontWeight: '800', marginTop: 2 },
  walletTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 3, marginTop: Spacing.md, overflow: 'hidden' },
  walletFill: { height: 6, backgroundColor: '#fff', borderRadius: 3 },

  actionRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg },
  action: { flex: 1, alignItems: 'center' },
  actionIcon: { width: 54, height: 54, borderRadius: BorderRadius.xl, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: FontSize.xs, color: Colors.text, marginTop: 6, fontWeight: '600' },

  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl2, padding: Spacing.lg, marginTop: Spacing.md, ...Shadows.sm },
  cardLabel: { fontSize: FontSize.xs, color: Colors.textLight, fontWeight: '800', letterSpacing: 1, marginBottom: Spacing.sm },
  cardTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  cardSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconChip: { width: 42, height: 42, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.lg, padding: Spacing.md, color: Colors.text },
  primaryBtn: { borderRadius: BorderRadius.full, paddingVertical: Spacing.md + 2, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: FontSize.md },
  outlineBtn: { borderWidth: 1.5, borderRadius: BorderRadius.full, paddingVertical: Spacing.sm + 2, alignItems: 'center', marginTop: Spacing.md },
  outlineBtnText: { fontWeight: '800' },
  price: { fontSize: FontSize.lg, fontWeight: '800' },
  features: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginTop: Spacing.sm },
  feature: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600' },

  emptyCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl2, padding: Spacing.xl, alignItems: 'center', ...Shadows.sm },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text, marginTop: Spacing.md },
  emptyMsg: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', marginTop: 6 },

  expandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.xl, marginBottom: Spacing.sm },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
});
