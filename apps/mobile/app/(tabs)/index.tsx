import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth-context';
import { useTenant } from '../../lib/tenant-context';
import { Colors, Spacing, BorderRadius, FontSize } from '../../lib/theme';
import { customersApi, packagesApi, paymentsApi, workoutsApi } from '../../lib/api';

interface DashboardData {
  upcomingWorkouts: number;
  totalWorkouts: number;
  activePackage: any;
  nextPayment: any;
  recentInvoices: any[];
  trainer: any;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { tenant } = useTenant();
  const [data, setData] = useState<DashboardData>({
    upcomingWorkouts: 0,
    totalWorkouts: 0,
    activePackage: null,
    nextPayment: null,
    recentInvoices: [],
    trainer: null,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const primaryColor = tenant?.primaryColor || Colors.primary;

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    // Load data in parallel
    const [workoutsRes, packagesRes, invoicesRes, paymentsRes] = await Promise.all([
      workoutsApi.list().catch(() => ({ data: [] })),
      packagesApi.myPackages().catch(() => ({ data: [] })),
      paymentsApi.listInvoices().catch(() => ({ data: [] })),
      paymentsApi.listPayments().catch(() => ({ data: [] })),
    ]);

    const workouts = workoutsRes.data || [];
    const packages = packagesRes.data || [];
    const invoices = invoicesRes.data || [];
    const payments = paymentsRes.data || [];

    const activePackage = packages.find((p: any) => p.status === 'active') || packages[0] || null;
    const pendingInvoices = invoices.filter((i: any) => i.status === 'pending' || i.status === 'overdue');
    const nextPayment = pendingInvoices[0] || null;

    setData({
      upcomingWorkouts: workouts.filter((w: any) => new Date(w.date) > new Date()).length,
      totalWorkouts: workouts.length,
      activePackage,
      nextPayment,
      recentInvoices: invoices.slice(0, 3),
      trainer: null,
    });
    setLoading(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: Colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />
      }
    >
      {/* Hero / Greeting */}
      <View style={[styles.hero, { backgroundColor: primaryColor }]}>
        <View style={styles.heroTop}>
          {tenant?.logo ? (
            <Image source={{ uri: tenant.logo }} style={styles.tenantLogo} />
          ) : (
            <View style={styles.tenantLogoPlaceholder}>
              <Text style={styles.tenantLogoText}>
                {(tenant?.name || 'D').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <Text style={styles.greeting}>Hi, {user?.firstName || 'there'}! 👋</Text>
            <Text style={styles.tenantName}>{tenant?.name || 'Welcome'}</Text>
            {tenant?.tagline && <Text style={styles.tagline}>{tenant.tagline}</Text>}
          </View>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <StatCard
          icon="barbell-outline"
          label="Total Workouts"
          value={data.totalWorkouts.toString()}
          color={primaryColor}
        />
        <StatCard
          icon="calendar-outline"
          label="Upcoming"
          value={data.upcomingWorkouts.toString()}
          color="#10b981"
        />
        <StatCard
          icon="card-outline"
          label="Active Plan"
          value={data.activePackage ? '✓' : '—'}
          color="#f59e0b"
        />
      </View>

      {/* Active Package / Subscription */}
      {data.activePackage && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Subscription</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/billing')}>
              <Text style={[styles.linkText, { color: primaryColor }]}>View all</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.packageCard, { borderColor: primaryColor }]}>
            <View style={styles.packageHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.packageName}>
                  {data.activePackage.name || data.activePackage.planName || 'Premium Plan'}
                </Text>
                <Text style={styles.packageSub}>
                  {data.activePackage.billingCycle || 'Monthly'} · {data.activePackage.status || 'active'}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: primaryColor + '20' }]}>
                <Text style={[styles.statusText, { color: primaryColor }]}>
                  {data.activePackage.status || 'active'}
                </Text>
              </View>
            </View>

            <View style={styles.packageDetails}>
              <View style={styles.packageDetail}>
                <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.packageDetailText}>
                  Started {new Date(data.activePackage.startDate || data.activePackage.createdAt).toLocaleDateString()}
                </Text>
              </View>
              {data.activePackage.nextBillingDate && (
                <View style={styles.packageDetail}>
                  <Ionicons name="refresh-outline" size={16} color={Colors.textSecondary} />
                  <Text style={styles.packageDetailText}>
                    Renews {new Date(data.activePackage.nextBillingDate).toLocaleDateString()}
                  </Text>
                </View>
              )}
              {data.activePackage.price && (
                <View style={styles.packageDetail}>
                  <Ionicons name="cash-outline" size={16} color={Colors.textSecondary} />
                  <Text style={styles.packageDetailText}>
                    ${data.activePackage.price}/{data.activePackage.billingCycle?.toLowerCase() || 'month'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Next Payment */}
      {data.nextPayment && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Next Payment Due</Text>
          </View>
          <TouchableOpacity style={styles.paymentCard}>
            <View style={[styles.paymentIcon, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="alert-circle" size={24} color="#f59e0b" />
            </View>
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <Text style={styles.paymentTitle}>
                ${data.nextPayment.amount || data.nextPayment.total} due
              </Text>
              <Text style={styles.paymentSub}>
                Invoice {data.nextPayment.invoiceNumber || data.nextPayment.id?.substring(0, 8)}
              </Text>
              <Text style={styles.paymentDue}>
                Due {new Date(data.nextPayment.dueDate).toLocaleDateString()}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.payButton, { backgroundColor: primaryColor }]}
              onPress={() => router.push('/(tabs)/billing')}
            >
              <Text style={styles.payButtonText}>Pay Now</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <QuickAction
            icon="barbell-outline"
            label="Log Workout"
            onPress={() => router.push('/(tabs)/workouts')}
            color={primaryColor}
          />
          <QuickAction
            icon="people-outline"
            label="Find Trainer"
            onPress={() => router.push('/(tabs)/team')}
            color="#10b981"
          />
          <QuickAction
            icon="card-outline"
            label="Payments"
            onPress={() => router.push('/(tabs)/billing')}
            color="#f59e0b"
          />
          <QuickAction
            icon="person-outline"
            label="Profile"
            onPress={() => router.push('/(tabs)/profile')}
            color="#8b5cf6"
          />
        </View>
      </View>

      {/* Recent Invoices */}
      {data.recentInvoices.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Invoices</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/billing')}>
              <Text style={[styles.linkText, { color: primaryColor }]}>View all</Text>
            </TouchableOpacity>
          </View>
          {data.recentInvoices.map((invoice: any) => (
            <View key={invoice.id} style={styles.invoiceRow}>
              <View style={[styles.invoiceIcon, { backgroundColor: primaryColor + '15' }]}>
                <Ionicons name="receipt-outline" size={20} color={primaryColor} />
              </View>
              <View style={{ flex: 1, marginLeft: Spacing.md }}>
                <Text style={styles.invoiceTitle}>
                  ${invoice.total || invoice.amount}
                </Text>
                <Text style={styles.invoiceSub}>
                  {invoice.invoiceNumber || invoice.id?.substring(0, 8)} ·{' '}
                  {new Date(invoice.createdAt || invoice.issueDate).toLocaleDateString()}
                </Text>
              </View>
              <View
                style={[
                  styles.invoiceStatus,
                  {
                    backgroundColor:
                      invoice.status === 'paid' ? '#dcfce7' : '#fef3c7',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.invoiceStatusText,
                    { color: invoice.status === 'paid' ? '#16a34a' : '#d97706' },
                  ]}
                >
                  {invoice.status}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: Spacing.xl }} />
    </ScrollView>
  );
}

function StatCard({ icon, label, value, color }: any) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function QuickAction({ icon, label, onPress, color }: any) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View style={[styles.quickActionIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  hero: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center' },
  tenantLogo: { width: 56, height: 56, borderRadius: BorderRadius.md, backgroundColor: Colors.white },
  tenantLogoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tenantLogoText: { fontSize: 24, fontWeight: 'bold', color: Colors.primary },
  greeting: { color: Colors.white, fontSize: FontSize.md, opacity: 0.9 },
  tenantName: { color: Colors.white, fontSize: FontSize.lg, fontWeight: 'bold', marginTop: 2 },
  tagline: { color: Colors.white, fontSize: FontSize.xs, opacity: 0.85, marginTop: 2 },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    marginTop: -Spacing.md,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  statValue: { fontSize: FontSize.lg, fontWeight: 'bold', color: Colors.text },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  section: {
    backgroundColor: Colors.white,
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  linkText: { fontSize: FontSize.sm, fontWeight: '600' },
  packageCard: {
    borderWidth: 2,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  packageHeader: { flexDirection: 'row', alignItems: 'center' },
  packageName: { fontSize: FontSize.md, fontWeight: 'bold', color: Colors.text },
  packageSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
  statusText: { fontSize: FontSize.xs, fontWeight: '600', textTransform: 'uppercase' },
  packageDetails: { marginTop: Spacing.md, gap: 6 },
  packageDetail: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  packageDetailText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: '#fffbeb',
    borderRadius: BorderRadius.md,
  },
  paymentIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentTitle: { fontSize: FontSize.md, fontWeight: 'bold', color: Colors.text },
  paymentSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  paymentDue: { fontSize: FontSize.xs, color: '#d97706', marginTop: 2, fontWeight: '600' },
  payButton: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md },
  payButtonText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: '600' },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  quickAction: {
    width: '23%',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  quickActionLabel: { fontSize: FontSize.xs, color: Colors.text, textAlign: 'center' },
  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  invoiceIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  invoiceTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  invoiceSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  invoiceStatus: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
  invoiceStatusText: { fontSize: FontSize.xs, fontWeight: '600', textTransform: 'uppercase' },
});
