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
import { useTenant } from '../../lib/tenant-context';
import { Colors, Spacing, BorderRadius, FontSize } from '../../lib/theme';
import { packagesApi, paymentsApi } from '../../lib/api';

export default function BillingScreen() {
  const { tenant } = useTenant();
  const [activeTab, setActiveTab] = useState<'plan' | 'invoices' | 'methods'>('plan');
  const [packages, setPackages] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [paying, setPaying] = useState(false);

  const primaryColor = tenant?.primaryColor || Colors.primary;

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [pkgRes, invRes, payRes] = await Promise.all([
      packagesApi.list().catch(() => ({ data: [] })),
      paymentsApi.listInvoices().catch(() => ({ data: [] })),
      paymentsApi.listPayments().catch(() => ({ data: [] })),
    ]);

    setPackages(pkgRes.data || getSamplePackages());
    setInvoices(invRes.data || getSampleInvoices());
    setPayments(payRes.data || getSamplePayments());
    setLoading(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function subscribeToPackage(pkg: any) {
    setPaying(true);
    const res = await packagesApi.subscribe(pkg.id, 'card').catch(() => ({ data: null } as any));
    if (!res.error) {
      Alert.alert('✓ Subscribed!', `You are now subscribed to ${pkg.name}. Welcome aboard!`);
      setSelectedPackage(null);
      loadData();
    } else {
      Alert.alert('Subscription Initiated', `Your request for ${pkg.name} has been received. Please complete payment.`);
      setSelectedPackage(null);
    }
    setPaying(false);
  }

  function getSamplePackages() {
    return [
      {
        id: 'pkg-1',
        name: 'Starter',
        price: 29,
        billingCycle: 'monthly',
        features: ['Gym access (8am-4pm)', 'Locker rental', 'Free WiFi', '1 group class/week'],
        isPopular: false,
        isCurrent: false,
      },
      {
        id: 'pkg-2',
        name: 'Pro',
        price: 59,
        billingCycle: 'monthly',
        features: ['24/7 gym access', 'All group classes', '1 PT session/month', 'Nutrition guide', 'Sauna & pool'],
        isPopular: true,
        isCurrent: true,
      },
      {
        id: 'pkg-3',
        name: 'Elite',
        price: 99,
        billingCycle: 'monthly',
        features: ['Everything in Pro', 'Unlimited PT sessions', 'Personal meal plan', 'Priority booking', 'Guest passes (2/mo)'],
        isPopular: false,
        isCurrent: false,
      },
    ];
  }

  function getSampleInvoices() {
    return [
      { id: 'inv-1', invoiceNumber: 'INV-2026-0042', amount: 59, status: 'paid', dueDate: '2026-06-15', createdAt: '2026-06-01' },
      { id: 'inv-2', invoiceNumber: 'INV-2026-0031', amount: 59, status: 'paid', dueDate: '2026-05-15', createdAt: '2026-05-01' },
      { id: 'inv-3', invoiceNumber: 'INV-2026-0020', amount: 59, status: 'paid', dueDate: '2026-04-15', createdAt: '2026-04-01' },
      { id: 'inv-4', invoiceNumber: 'INV-2026-0053', amount: 59, status: 'pending', dueDate: '2026-07-15', createdAt: '2026-06-25' },
    ];
  }

  function getSamplePayments() {
    return [
      { id: 'pay-1', amount: 59, method: 'Visa ****4242', date: '2026-06-01', status: 'completed' },
      { id: 'pay-2', amount: 59, method: 'Visa ****4242', date: '2026-05-01', status: 'completed' },
      { id: 'pay-3', amount: 59, method: 'Visa ****4242', date: '2026-04-01', status: 'completed' },
    ];
  }

  const currentPackage = packages.find((p) => p.isCurrent);
  const totalSpent = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabs}>
        {(['plan', 'invoices', 'methods'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && { borderBottomColor: primaryColor }]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && { color: primaryColor, fontWeight: '600' }]}>
              {tab === 'plan' ? 'My Plan' : tab === 'invoices' ? 'Invoices' : 'Payments'}
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
            {currentPackage && (
              <View style={[styles.currentCard, { backgroundColor: primaryColor }]}>
                <View style={styles.currentHeader}>
                  <View>
                    <Text style={styles.currentLabel}>Current Plan</Text>
                    <Text style={styles.currentName}>{currentPackage.name}</Text>
                  </View>
                  <View style={styles.currentBadge}>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
                    <Text style={styles.currentBadgeText}>Active</Text>
                  </View>
                </View>
                <View style={styles.currentDetails}>
                  <View style={styles.currentDetailRow}>
                    <Text style={styles.currentDetailLabel}>Price</Text>
                    <Text style={styles.currentDetailValue}>${currentPackage.price}/month</Text>
                  </View>
                  <View style={styles.currentDetailRow}>
                    <Text style={styles.currentDetailLabel}>Next billing</Text>
                    <Text style={styles.currentDetailValue}>Jul 15, 2026</Text>
                  </View>
                  <View style={styles.currentDetailRow}>
                    <Text style={styles.currentDetailLabel}>Total paid</Text>
                    <Text style={styles.currentDetailValue}>${totalSpent}</Text>
                  </View>
                </View>
              </View>
            )}

            <Text style={styles.sectionTitle}>Available Plans</Text>
            {packages.map((pkg) => (
              <View key={pkg.id} style={[styles.packageCard, pkg.isPopular && { borderColor: primaryColor, borderWidth: 2 }]}>
                {pkg.isPopular && (
                  <View style={[styles.popularBadge, { backgroundColor: primaryColor }]}>
                    <Text style={styles.popularText}>MOST POPULAR</Text>
                  </View>
                )}
                <View style={styles.packageHeader}>
                  <Text style={styles.packageName}>{pkg.name}</Text>
                  <Text style={styles.packagePrice}>
                    ${pkg.price}<Text style={styles.packageCycle}>/{pkg.billingCycle.replace('ly', '')}</Text>
                  </Text>
                </View>
                <View style={styles.featuresList}>
                  {pkg.features.map((f: string, i: number) => (
                    <View key={i} style={styles.featureRow}>
                      <Ionicons name="checkmark-circle" size={16} color={primaryColor} />
                      <Text style={styles.featureText}>{f}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity
                  style={[
                    styles.subscribeButton,
                    pkg.isCurrent
                      ? styles.currentButton
                      : { backgroundColor: primaryColor },
                  ]}
                  onPress={() => !pkg.isCurrent && setSelectedPackage(pkg)}
                  disabled={pkg.isCurrent}
                >
                  <Text style={[styles.subscribeText, pkg.isCurrent && { color: Colors.textSecondary }]}>
                    {pkg.isCurrent ? '✓ Current Plan' : 'Switch to ' + pkg.name}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : activeTab === 'invoices' ? (
          <View>
            {invoices.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="receipt-outline" size={48} color={Colors.textLight} />
                <Text style={styles.emptyText}>No invoices yet</Text>
              </View>
            ) : (
              invoices.map((inv) => (
                <TouchableOpacity key={inv.id} style={styles.invoiceCard}>
                  <View style={styles.invoiceHeader}>
                    <View>
                      <Text style={styles.invoiceNumber}>{inv.invoiceNumber}</Text>
                      <Text style={styles.invoiceDate}>
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={[
                      styles.invoiceStatus,
                      { backgroundColor: inv.status === 'paid' ? '#dcfce7' : inv.status === 'pending' ? '#fef3c7' : '#fee2e2' }
                    ]}>
                      <Text style={[
                        styles.invoiceStatusText,
                        { color: inv.status === 'paid' ? '#16a34a' : inv.status === 'pending' ? '#d97706' : '#dc2626' }
                      ]}>
                        {inv.status}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.invoiceBody}>
                    <View>
                      <Text style={styles.invoiceAmountLabel}>Amount</Text>
                      <Text style={styles.invoiceAmount}>${inv.amount}</Text>
                    </View>
                    <View>
                      <Text style={styles.invoiceAmountLabel}>Due Date</Text>
                      <Text style={styles.invoiceAmount}>{new Date(inv.dueDate).toLocaleDateString()}</Text>
                    </View>
                  </View>
                  {inv.status === 'pending' && (
                    <TouchableOpacity
                      style={[styles.payInvoiceButton, { backgroundColor: primaryColor }]}
                      onPress={async () => {
                        setPaying(true)
                        const res = await paymentsApi.payInvoice(inv.id, 'card').catch(() => ({ data: null } as any))
                        if (!res.error) {
                          Alert.alert('✓ Paid', 'Your payment has been processed.')
                          loadData()
                        } else {
                          Alert.alert('Payment Initiated', 'Redirecting to payment gateway...')
                        }
                        setPaying(false)
                      }}
                    >
                      <Text style={styles.payInvoiceText}>Pay ${inv.amount}</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        ) : (
          <View>
            <Text style={styles.sectionTitle}>Payment Methods</Text>

            <View style={[styles.methodCard, { borderColor: primaryColor }]}>
              <View style={[styles.methodIcon, { backgroundColor: primaryColor }]}>
                <Ionicons name="card" size={24} color={Colors.white} />
              </View>
              <View style={{ flex: 1, marginLeft: Spacing.md }}>
                <Text style={styles.methodName}>Visa ****4242</Text>
                <Text style={styles.methodExpiry}>Expires 12/2027</Text>
                <Text style={styles.methodDefault}>Default payment method</Text>
              </View>
              <Ionicons name="checkmark-circle" size={20} color={primaryColor} />
            </View>

            <TouchableOpacity style={styles.addMethodButton}>
              <Ionicons name="add-circle-outline" size={20} color={primaryColor} />
              <Text style={[styles.addMethodText, { color: primaryColor }]}>Add payment method</Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>Payment History</Text>
            {payments.length === 0 ? (
              <Text style={styles.emptyText}>No payments yet</Text>
            ) : (
              payments.map((p) => (
                <View key={p.id} style={styles.paymentRow}>
                  <View style={[styles.paymentIconSm, { backgroundColor: '#dcfce7' }]}>
                    <Ionicons name="checkmark" size={16} color="#16a34a" />
                  </View>
                  <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                    <Text style={styles.paymentTitle}>{p.method}</Text>
                    <Text style={styles.paymentDate}>{new Date(p.date).toLocaleDateString()}</Text>
                  </View>
                  <Text style={styles.paymentAmount}>${p.amount}</Text>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Subscribe Confirmation Modal */}
      <Modal visible={!!selectedPackage} animationType="slide" transparent>
        {selectedPackage && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Switch to {selectedPackage.name}</Text>
                <TouchableOpacity onPress={() => setSelectedPackage(null)}>
                  <Ionicons name="close" size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>
              <View style={styles.modalBody}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Plan</Text>
                  <Text style={styles.summaryValue}>{selectedPackage.name}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Billing</Text>
                  <Text style={styles.summaryValue}>Monthly</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Amount</Text>
                  <Text style={styles.summaryValue}>${selectedPackage.price}.00</Text>
                </View>
                <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.summaryLabel}>Payment</Text>
                  <Text style={styles.summaryValue}>Visa ****4242</Text>
                </View>

                <View style={styles.modalNote}>
                  <Ionicons name="information-circle" size={16} color={Colors.textSecondary} />
                  <Text style={styles.modalNoteText}>
                    You can cancel anytime. Billed monthly.
                  </Text>
                </View>
              </View>
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.confirmButton, { backgroundColor: primaryColor }, paying && { opacity: 0.6 }]}
                  onPress={() => subscribeToPackage(selectedPackage)}
                  disabled={paying}
                >
                  {paying ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <Text style={styles.confirmText}>Confirm Subscription</Text>
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
  sectionTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text, marginBottom: Spacing.md, marginTop: Spacing.sm },
  packageCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    position: 'relative',
  },
  popularBadge: { position: 'absolute', top: -10, right: Spacing.md, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
  popularText: { color: Colors.white, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  packageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: Spacing.md },
  packageName: { fontSize: FontSize.lg, fontWeight: 'bold', color: Colors.text },
  packagePrice: { fontSize: FontSize.xl, fontWeight: 'bold', color: Colors.text },
  packageCycle: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: 'normal' },
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
  methodCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 2 },
  methodIcon: { width: 48, height: 48, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center' },
  methodName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  methodExpiry: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  methodDefault: { fontSize: FontSize.xs, color: '#10b981', marginTop: 2, fontWeight: '600' },
  addMethodButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, padding: Spacing.md, justifyContent: 'center', marginBottom: Spacing.lg },
  addMethodText: { fontSize: FontSize.sm, fontWeight: '600' },
  paymentRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.xs },
  paymentIconSm: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  paymentTitle: { fontSize: FontSize.sm, fontWeight: '500', color: Colors.text },
  paymentDate: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  paymentAmount: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  empty: { alignItems: 'center', paddingVertical: Spacing.xl * 2 },
  emptyText: { fontSize: FontSize.md, color: Colors.textSecondary, marginTop: Spacing.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.white, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: FontSize.lg, fontWeight: 'bold', color: Colors.text },
  modalBody: { padding: Spacing.lg },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  summaryLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  summaryValue: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },
  modalNote: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.md, padding: Spacing.sm, backgroundColor: Colors.background, borderRadius: BorderRadius.sm },
  modalNoteText: { fontSize: FontSize.xs, color: Colors.textSecondary, flex: 1 },
  modalFooter: { padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border },
  confirmButton: { paddingVertical: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'center' },
  confirmText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '600' },
});
