import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTenant } from '@dexo/mobile-core/lib/tenant-context';
import { Colors, Spacing, BorderRadius, FontSize } from '@dexo/mobile-core/lib/theme';
import { fitnessApi } from '@dexo/mobile-core/lib/api';

// Nepal payment rails. Cash = pay at the counter (staff activates).
const PAYMENT_METHODS = [
  { key: 'ESEWA', label: 'eSewa', icon: 'wallet-outline' as const },
  { key: 'KHALTI', label: 'Khalti', icon: 'wallet-outline' as const },
  { key: 'CONNECTIPS', label: 'ConnectIPS', icon: 'card-outline' as const },
  { key: 'CASH', label: 'Cash at counter', icon: 'cash-outline' as const },
];

type TabKey = 'plan' | 'invoices' | 'methods';

export default function BillingScreen() {
  const { tenant } = useTenant();
  const primaryColor = tenant?.primaryColor || Colors.primary;

  const [activeTab, setActiveTab] = useState<TabKey>('plan');
  const [member, setMember] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Payment flow: either a plan to subscribe to, or an existing PENDING membership to pay.
  const [payTarget, setPayTarget] = useState<{ kind: 'plan' | 'membership'; plan?: any; membership?: any } | null>(null);
  const [method, setMethod] = useState('ESEWA');
  const [paying, setPaying] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const memberRes = await fitnessApi.members.me();
    const m = memberRes.data;
    setMember(m);
    const [plansRes, histRes] = await Promise.all([
      fitnessApi.plans.list({ active: 'true' }),
      m?.id ? fitnessApi.memberships.list({ memberId: m.id }) : Promise.resolve({ data: null as any }),
    ]);
    setPlans(Array.isArray(plansRes.data) ? plansRes.data : plansRes.data?.items ?? []);
    setHistory(Array.isArray(histRes.data) ? histRes.data : histRes.data?.items ?? []);
    setLoading(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const activeMembership = member?.memberships?.[0] || history.find((h) => h.status === 'ACTIVE') || null;
  const totalPaid = history
    .filter((h) => h.status === 'ACTIVE' || h.status === 'EXPIRED')
    .reduce((s, h) => s + Number(h.amountPaid || 0), 0);

  function startSubscribe(plan: any) {
    setPayTarget({ kind: 'plan', plan });
    setMethod('ESEWA');
  }
  function startPay(membership: any) {
    setPayTarget({ kind: 'membership', membership });
    setMethod('ESEWA');
  }

  async function confirmPayment() {
    if (!payTarget) return;
    setPaying(true);
    // In production the chosen rail redirects to the gateway and the callback
    // activates the membership. MVP: reference the method + timestamp and
    // activate directly (Cash = staff would confirm at the counter).
    const paymentRef = `${method}-${Date.now()}`;
    try {
      let membershipId = payTarget.membership?.id;
      if (payTarget.kind === 'plan') {
        if (!member?.id) throw new Error('Member profile not found');
        const created = await fitnessApi.memberships.create({ memberId: member.id, planId: payTarget.plan.id });
        if (created.error) throw new Error(created.error);
        membershipId = created.data?.id;
      }
      if (!membershipId) throw new Error('No membership to activate');

      if (method === 'CASH') {
        Alert.alert('Reserved', 'Please pay at the counter — staff will activate your membership.');
      } else {
        const act = await fitnessApi.memberships.activatePayment(membershipId, paymentRef, method);
        if (act.error) throw new Error(act.error);
        Alert.alert('✓ Payment successful', 'Your membership is now active. Welcome!');
      }
      setPayTarget(null);
      await loadData();
    } catch (e: any) {
      Alert.alert('Payment failed', e?.message || 'Please try again.');
    } finally {
      setPaying(false);
    }
  }

  const period = (t?: string) => ({ MONTHLY: 'month', QUARTERLY: 'quarter', HALF_YEARLY: '6 mo', YEARLY: 'year' } as Record<string, string>)[t ?? ''] || 'period';

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {(['plan', 'invoices', 'methods'] as TabKey[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && { borderBottomColor: primaryColor }]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && { color: primaryColor, fontWeight: '600' }]}>
              {tab === 'plan' ? 'My Plan' : tab === 'invoices' ? 'Billing' : 'Payment'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color={primaryColor} style={{ marginTop: Spacing.xl }} />
        ) : activeTab === 'plan' ? (
          <View>
            {activeMembership ? (
              <View style={[styles.currentCard, { backgroundColor: primaryColor }]}>
                <View style={styles.currentHeader}>
                  <View>
                    <Text style={styles.currentLabel}>Current Plan</Text>
                    <Text style={styles.currentName}>{activeMembership.plan?.name || 'Membership'}</Text>
                  </View>
                  <View style={styles.currentBadge}>
                    <Ionicons name="checkmark-circle" size={18} color={Colors.white} />
                    <Text style={styles.currentBadgeText}>{activeMembership.status}</Text>
                  </View>
                </View>
                <View style={styles.currentDetails}>
                  <Row label="Price" value={`NPR ${activeMembership.plan?.totalWithVat ?? activeMembership.amountPaid}`} />
                  <Row label="Valid until" value={activeMembership.endDate ? new Date(activeMembership.endDate).toLocaleDateString() : '—'} />
                  <Row label="Total paid" value={`NPR ${totalPaid}`} />
                </View>
              </View>
            ) : (
              <View style={styles.noticeCard}>
                <Ionicons name="information-circle-outline" size={22} color={primaryColor} />
                <Text style={styles.noticeText}>You don't have an active membership. Choose a plan below to get started.</Text>
              </View>
            )}

            <Text style={styles.sectionTitle}>Available Plans</Text>
            {plans.map((p, i) => {
              const isCurrent = activeMembership?.planId === p.id;
              return (
                <View key={p.id} style={[styles.packageCard, i === 1 && { borderColor: primaryColor, borderWidth: 2 }]}>
                  {i === 1 && (
                    <View style={[styles.popularBadge, { backgroundColor: primaryColor }]}>
                      <Text style={styles.popularText}>POPULAR</Text>
                    </View>
                  )}
                  <View style={styles.packageHeader}>
                    <Text style={styles.packageName}>{p.name}</Text>
                    <Text style={styles.packagePrice}>
                      NPR {p.totalWithVat}<Text style={styles.packageCycle}>/{period(p.type)}</Text>
                    </Text>
                  </View>
                  {!!p.description && <Text style={styles.packageDesc}>{p.description}</Text>}
                  <View style={styles.featuresList}>
                    <Feature ok label={`${p.durationDays} days access`} color={primaryColor} />
                    <Feature ok={p.includesTrainer} label="Personal trainer" color={primaryColor} />
                    <Feature ok={p.includesClasses} label="Group classes" color={primaryColor} />
                    <Feature ok={p.includesDietPlan} label="Diet plan" color={primaryColor} />
                  </View>
                  <TouchableOpacity
                    style={[styles.subscribeButton, isCurrent ? styles.currentButton : { backgroundColor: primaryColor }]}
                    onPress={() => !isCurrent && startSubscribe(p)}
                    disabled={isCurrent}
                  >
                    <Text style={[styles.subscribeText, isCurrent && { color: Colors.textSecondary }]}>
                      {isCurrent ? '✓ Current Plan' : `Subscribe · NPR ${p.totalWithVat}`}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        ) : activeTab === 'invoices' ? (
          <View>
            {history.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="receipt-outline" size={48} color={Colors.textLight} />
                <Text style={styles.emptyText}>No billing history yet</Text>
              </View>
            ) : (
              history.map((h) => (
                <View key={h.id} style={styles.invoiceCard}>
                  <View style={styles.invoiceHeader}>
                    <View>
                      <Text style={styles.invoiceNumber}>{h.plan?.name || 'Membership'}</Text>
                      <Text style={styles.invoiceDate}>{new Date(h.startDate).toLocaleDateString()}</Text>
                    </View>
                    <View style={[styles.invoiceStatus, { backgroundColor: statusBg(h.status) }]}>
                      <Text style={[styles.invoiceStatusText, { color: statusFg(h.status) }]}>{h.status}</Text>
                    </View>
                  </View>
                  <View style={styles.invoiceBody}>
                    <View>
                      <Text style={styles.invoiceAmountLabel}>Amount</Text>
                      <Text style={styles.invoiceAmount}>NPR {h.amountPaid ?? h.plan?.totalWithVat}</Text>
                    </View>
                    <View>
                      <Text style={styles.invoiceAmountLabel}>Valid until</Text>
                      <Text style={styles.invoiceAmount}>{h.endDate ? new Date(h.endDate).toLocaleDateString() : '—'}</Text>
                    </View>
                  </View>
                  {h.status === 'PENDING' && (
                    <TouchableOpacity style={[styles.payInvoiceButton, { backgroundColor: primaryColor }]} onPress={() => startPay(h)}>
                      <Text style={styles.payInvoiceText}>Pay NPR {h.amountPaid ?? h.plan?.totalWithVat}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </View>
        ) : (
          <View>
            <Text style={styles.sectionTitle}>Accepted Payment Methods</Text>
            {PAYMENT_METHODS.map((pm) => (
              <View key={pm.key} style={styles.methodCard}>
                <View style={[styles.methodIcon, { backgroundColor: primaryColor }]}>
                  <Ionicons name={pm.icon} size={22} color={Colors.white} />
                </View>
                <Text style={styles.methodName}>{pm.label}</Text>
              </View>
            ))}
            <Text style={styles.methodNote}>Pay online via eSewa, Khalti or ConnectIPS, or settle in cash at the counter. Digital payments qualify for the IRD 10% VAT refund.</Text>
          </View>
        )}
      </ScrollView>

      {/* Payment modal */}
      <Modal visible={!!payTarget} animationType="slide" transparent>
        {payTarget && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {payTarget.kind === 'plan' ? `Subscribe · ${payTarget.plan?.name}` : `Pay · ${payTarget.membership?.plan?.name}`}
                </Text>
                <TouchableOpacity onPress={() => setPayTarget(null)}>
                  <Ionicons name="close" size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>
              <View style={styles.modalBody}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Amount</Text>
                  <Text style={styles.summaryValue}>
                    NPR {payTarget.kind === 'plan' ? payTarget.plan?.totalWithVat : (payTarget.membership?.amountPaid ?? payTarget.membership?.plan?.totalWithVat)}
                  </Text>
                </View>
                <Text style={[styles.summaryLabel, { marginTop: Spacing.md, marginBottom: Spacing.sm }]}>Choose payment method</Text>
                {PAYMENT_METHODS.map((pm) => (
                  <TouchableOpacity
                    key={pm.key}
                    style={[styles.methodOption, method === pm.key && { borderColor: primaryColor, backgroundColor: primaryColor + '10' }]}
                    onPress={() => setMethod(pm.key)}
                  >
                    <Ionicons name={pm.icon} size={20} color={method === pm.key ? primaryColor : Colors.textSecondary} />
                    <Text style={[styles.methodOptionText, method === pm.key && { color: primaryColor, fontWeight: '700' }]}>{pm.label}</Text>
                    {method === pm.key && <Ionicons name="checkmark-circle" size={20} color={primaryColor} />}
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.confirmButton, { backgroundColor: primaryColor }, paying && { opacity: 0.6 }]}
                  onPress={confirmPayment}
                  disabled={paying}
                >
                  {paying ? <ActivityIndicator color={Colors.white} /> : (
                    <Text style={styles.confirmText}>{method === 'CASH' ? 'Reserve (pay at counter)' : 'Pay now'}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.currentDetailRow}>
      <Text style={styles.currentDetailLabel}>{label}</Text>
      <Text style={styles.currentDetailValue}>{value}</Text>
    </View>
  );
}
function Feature({ ok, label, color }: { ok?: boolean; label: string; color: string }) {
  return (
    <View style={styles.featureRow}>
      <Ionicons name={ok ? 'checkmark-circle' : 'close-circle-outline'} size={16} color={ok ? color : Colors.textLight} />
      <Text style={[styles.featureText, !ok && { color: Colors.textLight }]}>{label}</Text>
    </View>
  );
}
function statusBg(s: string) { return s === 'ACTIVE' ? '#dcfce7' : s === 'PENDING' ? '#fef3c7' : s === 'FROZEN' ? '#dbeafe' : '#fee2e2'; }
function statusFg(s: string) { return s === 'ACTIVE' ? '#16a34a' : s === 'PENDING' ? '#d97706' : s === 'FROZEN' ? '#2563eb' : '#dc2626'; }

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  tabs: { flexDirection: 'row', backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tab: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },
  currentCard: { borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.lg },
  currentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  currentLabel: { color: Colors.white, fontSize: FontSize.xs, opacity: 0.85, textTransform: 'uppercase' },
  currentName: { color: Colors.white, fontSize: FontSize.xl, fontWeight: 'bold', marginTop: 2 },
  currentBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.full },
  currentBadgeText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: '600' },
  currentDetails: { gap: 8 },
  currentDetailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  currentDetailLabel: { color: Colors.white, opacity: 0.85, fontSize: FontSize.sm },
  currentDetailValue: { color: Colors.white, fontSize: FontSize.sm, fontWeight: '600' },
  noticeCard: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', backgroundColor: '#fff', padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.lg },
  noticeText: { flex: 1, color: Colors.textSecondary, fontSize: FontSize.sm },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text, marginBottom: Spacing.md, marginTop: Spacing.sm },
  packageCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border, position: 'relative' },
  popularBadge: { position: 'absolute', top: -10, right: Spacing.md, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
  popularText: { color: Colors.white, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  packageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 },
  packageName: { fontSize: FontSize.lg, fontWeight: 'bold', color: Colors.text },
  packagePrice: { fontSize: FontSize.lg, fontWeight: 'bold', color: Colors.text },
  packageCycle: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: 'normal' },
  packageDesc: { fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.md },
  featuresList: { gap: 8, marginBottom: Spacing.md },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  featureText: { fontSize: FontSize.sm, color: Colors.text, flex: 1 },
  subscribeButton: { paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, alignItems: 'center' },
  currentButton: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  subscribeText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: '600' },
  invoiceCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  invoiceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  invoiceNumber: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  invoiceDate: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  invoiceStatus: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
  invoiceStatusText: { fontSize: FontSize.xs, fontWeight: '600', textTransform: 'uppercase' },
  invoiceBody: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  invoiceAmountLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, textTransform: 'uppercase' },
  invoiceAmount: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text, marginTop: 2 },
  payInvoiceButton: { marginTop: Spacing.sm, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, alignItems: 'center' },
  payInvoiceText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: '600' },
  methodCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  methodIcon: { width: 44, height: 44, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center' },
  methodName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  methodNote: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: Spacing.md, lineHeight: 18 },
  empty: { alignItems: 'center', paddingVertical: Spacing.xl * 2 },
  emptyText: { fontSize: FontSize.md, color: Colors.textSecondary, marginTop: Spacing.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.white, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: FontSize.lg, fontWeight: 'bold', color: Colors.text, flex: 1 },
  modalBody: { padding: Spacing.lg },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  summaryLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  summaryValue: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  methodOption: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm },
  methodOptionText: { flex: 1, fontSize: FontSize.md, color: Colors.text },
  modalFooter: { padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border },
  confirmButton: { paddingVertical: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'center' },
  confirmText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '600' },
});
